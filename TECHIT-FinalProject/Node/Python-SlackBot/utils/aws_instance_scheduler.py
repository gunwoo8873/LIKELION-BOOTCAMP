import os
import concurrent.futures
import pytz
import mysql.connector
import logging
from mysql.connector import Error
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.base import JobLookupError
from slack_sdk import WebClient
from utils.aws_manager import AWSInstanceController, IAMPolicyManager

class BotoScheduler():
    """
    AWS 리소스의 상태를 주기적으로 조회하고, 
    변경 사항을 Slack으로 알리는 스케줄러 클래스입니다.

    Attributes:
        host (str): 데이터베이스 호스트 주소
        port (int): 데이터베이스 포트 번호
        database (str): 데이터베이스 이름
        user (str): 데이터베이스 사용자 이름
        password (str): 데이터베이스 사용자 비밀번호
        logger (logging.Logger): 로깅을 위한 Logger
        scheduled_jobs (bool): 스케줄된 작업 활성화 여부
        policy_manager (IAMPolicyManager): IAM 정책 관리 클래스
        client (WebClient): Slack WebClient
        channel_id (str): Slack 알림을 보낼 채널 ID
        aws_instance_controller (AWSInstanceController): AWS 리소스 관리 클래스
        quiet_hours_start (str): QUIET_HOURS 시작하는 시간
        quiet_hours_end (str): QUIET_HOURS 끝나는 시간
        alert_value (int): 알림 수치
    """
    def __init__(
            self,
            host: str,
            port: int,
            database: str,
            user: str,
            password: str,
            logger: logging.Logger,
            scheduled_jobs: bool,
            policy_manager: IAMPolicyManager,
            client: WebClient,
            channel_id: str,
            aws_instance_controller: AWSInstanceController,
            quiet_hours_start: str,
            quiet_hours_end: str,
            alert_value: int = 90
        ):
        self.logger = logger
        self.scheduled_jobs = scheduled_jobs
        self.policy_manager = policy_manager
        self.aws_instance_controller = aws_instance_controller
        self.channel_id = channel_id
        self.client = client
        self.quiet_hours_start = quiet_hours_start
        self.quiet_hours_end = quiet_hours_end
        self.alert_value = alert_value

        ec2_status, rds_status, asg_status = self.instances_status()
        self.instance_status = {
            'ec2': ec2_status,
            'rds': rds_status,
            'asg': asg_status
        }

        self.mysql_config = {
            'host': host,
            'port': port,
            'database': database,
            'user': user,
            'password': password
        }

        self.scheduler = AsyncIOScheduler()
        self.scheduler.start()
        self.scheduler.add_job(self.monitor_instances_status, 'cron', minute='*/5', id='monitor_instances_status')

    def list_jobs(self) -> list:
        jobs = self.scheduler.get_jobs()
        result = []
        for job in jobs:
            result.append(f'ID: {job.id}, Next Run Time: {job.next_run_time.isoformat()}, Trigger: {job.trigger}')
        
        return result

    def remove_job(self, job_id: str) -> str:
        try:
            self.scheduler.remove_job(job_id)
        except JobLookupError:
            return f'작업 "{job_id}"가 존재하지 않습니다.'
        return f'작업 "{job_id}"가 삭제되었습니다.'

    def instances_status(self):
        """모든 리소스의 상태를 확인하는 함수."""
        self.policy_manager.attach_policies()

        if not self.scheduled_jobs:
            self.logger.debug('instances_status: FALSE')
            return str(), str(), str()
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.aws_instance_controller.status_all_ec2_instances)
            rds_future = executor.submit(self.aws_instance_controller.status_all_rds_instances)
            asg_future = executor.submit(self.aws_instance_controller.status_all_auto_scaling_groups)
            
            ec2_status = ec2_future.result()
            rds_status = rds_future.result()
            asg_status = asg_future.result()

            return ec2_status, rds_status, asg_status

    async def monitor_instances_status(self):
        current_ec2_status, current_rds_status, current_asg_status = self.instances_status()
        result = []

        old_ec2_ids = {ec2['EC2_ID']: ec2 for ec2 in self.instance_status['ec2']}
        current_ec2_ids = {ec2['EC2_ID']: ec2 for ec2 in current_ec2_status}

        # EC2 인스턴스 확인
        for ec2_id, ec2 in current_ec2_ids.items():
            if ec2_id not in old_ec2_ids:
                result.append(f"EC2 {ec2_id} 추가됨: {ec2}")
            else:
                old_ec2 = old_ec2_ids[ec2_id]

                # 태그가 사라졌을 때
                removed_keys = [key for key in old_ec2 if key not in ec2]
                for key in removed_keys:
                    result.append(f"EC2 {ec2_id}의 {key} 태그가 제거됨: 이전 값 -> {old_ec2[key]}")

                # 인스턴스의 변화 확인
                for key, value in ec2.items():
                    old_value = old_ec2.get(key)  # 이전 인스턴스에서 key의 값을 가져오기
                    if old_value != value:
                        ec2_display_name = f'{ec2_id}({ec2.get('Name')})' if ec2.get('Name') else ec2_id

                        if key in ['CPU', 'RAM']:
                            value = float(value)
                            if not value:
                                result.append(f'EC2 {ec2_display_name}의 {key} 변경됨: {old_value} -> 확인 불가')
                            elif self.alert_value <= value:
                                result.append(f'EC2 {ec2_display_name}의 {key} 사용량이 {value:.2f}% 입니다!')
                            else:
                                pass
                        elif key in ['NetworkIn', 'NetworkOut']:
                            pass
                        elif not old_value and value:
                            result.append(f'EC2 {ec2_display_name}에 새로운 {key} 지정됨: {value}')
                        else:
                            result.append(f'EC2 {ec2_display_name}의 {key} 변경됨: {old_value} -> {value}')

        # EC2 제거된 인스턴스 확인
        for ec2_id in old_ec2_ids:
            if ec2_id not in current_ec2_ids:
                result.append(f"EC2 {ec2_id} 제거됨: {old_ec2_ids[ec2_id]}")

        old_rds_ids = {rds['RDS_Identifier']: rds for rds in self.instance_status['rds']}
        current_rds_ids = {rds['RDS_Identifier']: rds for rds in current_rds_status}

        # RDS 인스턴스 확인
        for rds_id, rds in current_rds_ids.items():
            if rds_id not in old_rds_ids:
                result.append(f"RDS {rds_id} 추가됨: {rds}")
            else:
                for key, value in rds.items():
                    if old_rds_ids[rds_id].get(key) != value:
                        result.append(f"RDS {rds_id}의 {key} 변경됨: {old_rds_ids[rds_id][key]} -> {value}")

        # RDS 제거된 인스턴스 확인
        for rds_id in old_rds_ids:
            if rds_id not in current_rds_ids:
                result.append(f"RDS {rds_id} 제거됨: {old_rds_ids[rds_id]}")

        old_asg_ids = {asg['ASG_NAME']: asg for asg in self.instance_status['asg']}
        current_asg_ids = {asg['ASG_NAME']: asg for asg in current_asg_status}

        # ASG 인스턴스 확인
        for asg_id, asg in current_asg_ids.items():
            if asg_id not in old_asg_ids:
                result.append(f"ASG {asg_id} 추가됨: {asg}")
            else:
                for key, value in asg.items():
                    if old_asg_ids[asg_id].get(key) != value:
                        result.append(f"ASG {asg_id}의 {key} 변경됨: {old_asg_ids[asg_id][key]} -> {value}")

        # ASG 제거된 인스턴스 확인
        for asg_id in old_asg_ids:
            if asg_id not in current_asg_ids:
                result.append(f"ASG {asg_id} 제거됨: {old_asg_ids[asg_id]}")

        # 인스턴스의 모든 정보를 업데이트
        self.instance_status['ec2'] = current_ec2_status
        self.instance_status['rds'] = current_rds_status
        self.instance_status['asg'] = current_asg_status

        if result:
            text = '\n'.join(result)
            self.client.chat_postMessage(channel=self.channel_id, text=text)
        
        self.mysql_insert_my_status()

    def mysql_insert_my_status(self):
        try:
            connection = mysql.connector.connect(**self.mysql_config)
            if connection.is_connected():
                cursor = connection.cursor()
                ec2_insert_query = """
                INSERT INTO ec2_status (ec2_id, state, launch_time, instance_type, private_ip, public_ip, cpu_utilization, ram_utilization, network_in_utilization, network_out_utilization, name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                for ec2_instance in self.instance_status['ec2']:
                    cursor.execute(ec2_insert_query, (
                        ec2_instance['EC2_ID'],
                        ec2_instance['State'],
                        ec2_instance['LaunchTime'],
                        ec2_instance['Type'],
                        ec2_instance.get('PrivateIpAddress', None),
                        ec2_instance.get('PublicIpAddress', None),
                        ec2_instance.get('CPU', None),
                        ec2_instance.get('RAM', None),
                        ec2_instance.get('NetworkIn', None),
                        ec2_instance.get('NetworkOut', None),
                        ec2_instance.get('Name', None)
                    ))

                rds_insert_query = """
                INSERT INTO rds_status (rds_identifier, status, class, engine_version)
                VALUES (%s, %s, %s, %s)
                """
                for rds_instance in self.instance_status['rds']:
                    cursor.execute(rds_insert_query, (
                        rds_instance['RDS_Identifier'],
                        rds_instance['Status'],
                        rds_instance['Class'],
                        rds_instance['EngineVersion']
                    ))

                asg_insert_query = """
                INSERT INTO asg_status (asg_name, instances, desired_capacity, min_size, max_size, default_cooldown)
                VALUES (%s, %s, %s, %s, %s, %s)
                """
                for asg_instance in self.instance_status['asg']:
                    cursor.execute(asg_insert_query, (
                        asg_instance['ASG_NAME'],
                        asg_instance['Instances'],
                        asg_instance['DesiredCapacity'],
                        asg_instance['MinSize'],
                        asg_instance['MaxSize'],
                        asg_instance['DefaultCooldown']
                    ))

                connection.commit()
        except Error as e:
            self.logger.error(f'Error: {e}')
        finally:
            if connection.is_connected():
                cursor.close()
                connection.close()

    def add_job(self, func, run_date, args=[]):
        self.scheduler.add_job(func, 'date', run_date=run_date, args=args)
