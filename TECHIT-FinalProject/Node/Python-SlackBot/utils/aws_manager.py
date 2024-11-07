import boto3
import concurrent.futures
import pytz
import logging
from datetime import datetime, timedelta, timezone
from botocore.exceptions import ClientError

class AWSInstanceController:
    """AWS 리소스를 관리하는 클래스입니다.

    Parameters:
        db_instance_ids (str): 데이터베이스 인스턴스 ID를 쉼표로 구분한 문자열
        db_protect_ids (str): 보호된 데이터베이스 인스턴스 ID를 쉼표로 구분한 문자열
        ec2_instance_ids (str): EC2 인스턴스 ID를 쉼표로 구분한 문자열
        control_plane (str): ASG Master 이름
        worker (str): ASG Worker 이름
        logger (logging.Logger): 로깅을 위한 Logger
        region (str): AWS Region 정보
    """
    def __init__(
            self,
            db_instance_ids: str,
            db_protect_ids: str,
            ec2_instance_ids: str,
            control_plane: str,
            worker: str,
            logger: logging.Logger,
            region: str
        ):
        self.is_working = False
        self.db_instance_ids = db_instance_ids.split(',') if db_instance_ids else []
        self.db_protect_ids = db_protect_ids.split(',') if db_protect_ids else []
        self.ec2_instance_ids = ec2_instance_ids.split(',') if ec2_instance_ids else []
        self.control_plane = control_plane
        self.worker = worker
        self.logger = logger
        self.region = region

    def format_bytes(self, size: float) -> str:
        if not size:
            return "0 B"

        # 단위 리스트
        units = ['B', 'K', 'M', 'G', 'T']
        index = 0

        while size >= 1024 and index < len(units) - 1:
            size /= 1024.0
            index += 1

        # 소수점 한 자리까지 표시
        return f"{size:.1f} {units[index]}"
    
    def format_output(self, data):
        """Status 값을 받고 Slack으로 보내기 전에 저를 한번 생각해 주세요."""
        if not data:
            return ""
        
        formatted_lines = []
        
        for item in data:
            if item.get('NetworkIn'):
                item['NetworkIn'] = self.format_bytes(item['NetworkIn'])
            if item.get('NetworkOut'):
                item['NetworkOut'] = self.format_bytes(item['NetworkOut'])
            formatted_lines.append(", ".join([f"{key}: {item[key]}" for key in item.keys()]))
        
        return "\n".join(formatted_lines)

    # RDS
    def manage_rds_instance(self, action: str, db_instance_ids: list = []) -> bool:
        """
        RDS 인스턴스 상태를 변경하는 함수.

        :param action: RDS 인스턴스에서 수행할 작업. 
                    'start'는 인스턴스를 시작하고,
                    'stop'은 인스턴스를 중지합니다.
        :type action: str
        """
        rds = boto3.client('rds')
        describe_instances = rds.describe_db_instances()
        for instance in describe_instances['DBInstances']:
            db_instance_id = instance['DBInstanceIdentifier']

            def action_db_instance():
                if instance['DBInstanceIdentifier'] == db_instance_id:
                    current_state = instance['DBInstanceStatus']

                    # 인스턴스를 시작하려면 'stopped' 상태여야 합니다.
                    if action == 'start' and current_state != 'stopped':
                        self.logger.debug(f'RDS {db_instance_id} 인스턴스는 {current_state} 상태입니다.')
                        return False
                    # 인스턴스를 중지하려면 'available' 상태여야 합니다.
                    if action == 'stop' and current_state != 'available':
                        self.logger.debug(f'RDS {db_instance_id} 인스턴스는 {current_state} 상태입니다.')
                        return False

                    try:
                        if action == 'start':
                            response = rds.start_db_instance(DBInstanceIdentifier=db_instance_id)
                            self.logger.debug(f'RDS {db_instance_id} 인스턴스 시작: {response}')
                        elif action == 'stop':
                            if db_instance_id in self.db_protect_ids:
                                self.logger.debug(f'RDS Protect, {db_instance_id} 인스턴스는 중지되지 않습니다.')
                            else:
                                response = rds.stop_db_instance(DBInstanceIdentifier=db_instance_id)
                                self.logger.debug(f'RDS {db_instance_id} 인스턴스 중지: {response}')
                        else:
                            self.logger.error(f'RDS 인스턴스, {action}는 존재하지 않는 action입니다.')
                            return False
                    except ClientError as e:
                        if e.response['Error']['Code'] == 'InvalidDBInstanceState':
                            self.logger.error(f'RDS Error: {e.response['Error']['Message']}')
                            instance_info = rds.describe_db_instances(DBInstanceIdentifier=db_instance_id)
                            current_state = instance_info['DBInstances'][0]['DBInstanceStatus']
                            self.logger.error(f'RDS 인스턴스 상태: {current_state}')
                        else:
                            self.logger.error(f'알 수 없는 오류 발생: {e}')
                            return False
                    
                    return True
        
            if not db_instance_ids or (db_instance_id in db_instance_ids):
                action_db_instance()

        return True

    # EC2
    def manage_ec2_instance(self, action: str, ec2_instance_ids: list = []) -> bool:
        """
        EC2 인스턴스 상태를 변경하는 함수.

        :param action: EC2 인스턴스에서 수행할 작업.
                    'start'는 인스턴스를 시작하고,
                    'stop'은 인스턴스를 중지합니다.
        :type action: str
        """
        ec2 = boto3.client('ec2')
        try:
            describe_instances = ec2.describe_instances()
            for instance in describe_instances['Reservations']:
                ec2_instance_id = instance['Instances'][0]['InstanceId']

                def action_ec2_instance():
                    current_state = instance['Instances'][0]['State']['Name']

                    # 인스턴스를 시작하려면 'stopped' 상태여야 합니다.
                    if action == 'start' and current_state != 'stopped':
                        self.logger.debug(f'EC2 {ec2_instance_id} 인스턴스는 {current_state} 상태입니다.')
                        return False
                    # 인스턴스를 중지하려면 'running' 상태여야 합니다.
                    if action == 'stop' and current_state != 'running':
                        self.logger.debug(f'EC2 {ec2_instance_id} 인스턴스는 {current_state} 상태입니다.')
                        return False
                    
                    if action == 'start':
                        response = ec2.start_instances(InstanceIds=[ec2_instance_id])
                        self.logger.debug(f'EC2 {ec2_instance_id} 인스턴스 시작: {response}')
                    elif action == 'stop':
                        response = ec2.stop_instances(InstanceIds=[ec2_instance_id])
                        self.logger.debug(f'EC2 {ec2_instance_id} 인스턴스 중지: {response}')
                    else:
                        self.logger.error(f'EC2 인스턴스 {action}는 존재하지 않는 action입니다.')
                        return False

                    return True

                if not ec2_instance_ids or (ec2_instance_id in ec2_instance_ids):
                    action_ec2_instance()

        except Exception as e:
            self.logger.error(f'EC2 Error: {e}')
            return False
        
        return True
    
    # Auto Scaling Group
    def update_auto_scaling_group_capacity(self, asg_info_list: dict = {}, default_desired_capacity: int = 0) -> None:
        """
        Auto Scaling 그룹의 Desired Capacity를 업데이트하는 함수.
        """
        autoscaling = boto3.client('autoscaling')

        describe_auto_scaling_groups = autoscaling.describe_auto_scaling_groups()
        for group in describe_auto_scaling_groups['AutoScalingGroups']:
            group_name = group['AutoScalingGroupName']

            def update_desired_capacity():
                if not asg_info_list or (group_name in asg_info_list):
                    # desired capacity가 사용자가 원하는 용량이랑 똑같은지 확인하여 원래 값이랑 같을 경우 로그만 남깁니다.
                    desired_capacity = asg_info_list[group_name]['DesiredCapacity'] if asg_info_list else default_desired_capacity
                    if group['DesiredCapacity'] == desired_capacity:
                        self.logger.debug(f'{group_name}의 원하는 용량은 이미 {desired_capacity} 입니다.')
                        return False
                    
                    try:
                        autoscaling.update_auto_scaling_group(
                            AutoScalingGroupName=group_name,
                            DesiredCapacity=desired_capacity
                        )

                        self.logger.debug(f'{group_name}의 원하는 용량을 {desired_capacity} 값으로 업데이트했습니다.')
                    except Exception as e:
                        self.logger.error(f'{group_name} 업데이트 중 오류 발생: {e}')
                        return False
            
            update_desired_capacity()

    def all_update_auto_scaling_group_capacity(self, desired_capacity: int = 0) -> str:
        self.update_auto_scaling_group_capacity(default_desired_capacity=desired_capacity)
        return f'모든 ASG의 원하는 용량을 {desired_capacity} 값으로 변경했습니다.'

    # Custom Resources
    def start_custom_all_resources(self) -> str:
        """
        설정에 있는 모든 리소스를 시작하는 함수.
        RDS, EC2, kOps를 시작하는 함수입니다.
        """
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.manage_ec2_instance, 'start', self.ec2_instance_ids)
            rds_future = executor.submit(self.manage_rds_instance, 'start', self.db_instance_ids)
            asg_future = executor.submit(self.update_auto_scaling_group_capacity, {
                self.control_plane: {'DesiredCapacity': 1},
                self.worker: {'DesiredCapacity': 1}
            })

            ec2_future.result()
            rds_future.result()
            asg_future.result()

        return '특정된 모든 리소스가 시작되었습니다.'

    def stop_custom_all_resources(self) -> str:
        """
        설정에 있는 모든 리소스를 중지하는 함수.
        RDS, EC2, kOps를 중지하는 함수입니다.
        """
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.manage_ec2_instance, 'stop', self.ec2_instance_ids)
            rds_future = executor.submit(self.manage_rds_instance, 'stop', self.db_instance_ids)
            asg_future = executor.submit(self.update_auto_scaling_group_capacity, {
                self.control_plane: {'DesiredCapacity': 0},
                self.worker: {'DesiredCapacity': 0}
            })

            ec2_future.result()
            rds_future.result()
            asg_future.result()

        return '특정된 모든 리소스가 중지되었습니다.'

    def status_custom_all_resources(self) -> str:
        """설정에 있는 RDS, EC2, kOps의 상태를 확인하는 함수입니다."""
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.status_all_ec2_instances, self.ec2_instance_ids)
            rds_future = executor.submit(self.status_all_rds_instances, self.db_instance_ids)
            asg_future = executor.submit(self.status_all_auto_scaling_groups, [self.control_plane, self.worker])
            
            ec2_output = self.format_output(ec2_future.result())
            rds_output = self.format_output(rds_future.result())
            asg_output = self.format_output(asg_future.result())

        return f'{ec2_output}\n\n{rds_output}\n\n{asg_output}'

    # ALL
    ## EC2
    def start_all_ec2_instances(self) -> str:
        self.manage_ec2_instance('start')
        return '모든 EC2 인스턴스를 시작합니다.'

    def stop_all_ec2_instances(self) -> str:
        self.manage_ec2_instance('stop')
        return '모든 EC2 인스턴스를 중지합니다.'

    ## RDS
    def start_all_rds_instances(self) -> str:
        self.manage_rds_instance('start')
        return '모든 RDS 인스턴스를 시작합니다.'
    
    def stop_all_rds_instances(self) -> str:
        self.manage_rds_instance('stop')
        return '모든 RDS 인스턴스를 중지합니다.'

    ## Status
    def status_all_ec2_instances(self, instances: list = []) -> list[dict]:
        cloudwatch = boto3.client('cloudwatch', region_name=self.region)
        ec2 = boto3.client('ec2')
        ec2_info_list = []

        try:
            describe_instances = ec2.describe_instances()
            for reservation in describe_instances['Reservations']:
                for instance in reservation['Instances']:
                    # 인스턴스 이름을 태그에서 가져오기
                    def get_instance_name():
                        if 'Tags' in instance:
                            for tag in instance['Tags']:
                                if tag['Key'] == 'Name':
                                    return tag['Value']
                                
                        return None

                    instance_name = get_instance_name()
                    if not instances or (instance['InstanceId'] in instances) or (instance_name in instances):
                        def get_launch_time():
                            launch_time = instance['LaunchTime']  # UTC
                            utc_zone = pytz.utc
                            kst_zone = pytz.timezone('Asia/Seoul')
                            launch_time_utc = launch_time.replace(tzinfo=utc_zone)
                            launch_time_kst = launch_time_utc.astimezone(kst_zone)
                            return launch_time_kst.isoformat()

                        network = self.get_network_utilization(cloudwatch, instance['InstanceId'])

                        instance_info = {
                            'EC2_ID': instance['InstanceId'],
                            'State': instance['State']['Name'],
                            'LaunchTime': get_launch_time(),
                            'Type': instance['InstanceType'],
                            'PrivateIpAddress': instance.get('PrivateIpAddress', None),
                            'PublicIpAddress': instance.get('PublicIpAddress', None),
                            'CPU': self.get_cpu_utilization(cloudwatch, instance['InstanceId']),
                            'RAM': self.get_ram_utilization(cloudwatch, instance['InstanceId']),
                            'NetworkIn': network['NetworkIn'],
                            'NetworkOut': network['NetworkOut'],
                        }

                        if instance_name:
                            instance_info['Name'] = instance_name
                        
                        ec2_info_list.append(instance_info)

        except Exception as e:
            return f'오류 발생: {e}'

        return ec2_info_list

    def get_cpu_utilization(self, cloudwatch, instance_id) -> float:
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(minutes=5)

        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='CPUUtilization',
            Dimensions=[
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                },
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=60,
            Statistics=['Average']
        )

        data_points = response['Datapoints']
        if data_points:
            average_cpu = data_points[-1]['Average']
            return f'{average_cpu:.2f}'
        else:
            return 0
    
    def get_ram_utilization(self, cloudwatch, instance_id) -> float:
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(minutes=5)

        response = cloudwatch.get_metric_statistics(
            Namespace='CWAgent',
            MetricName='mem_used_percent',
            Dimensions=[
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                },
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=60,
            Statistics=['Average']
        )
        data_points = response['Datapoints']
        if data_points:
            return f'{data_points[-1]['Average']:.2f}'
        else:
            return 0
        
    def get_network_utilization(self, cloudwatch, instance_id) -> dict:
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(minutes=5)

        response_in = cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='NetworkIn',
            Dimensions=[
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                },
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=60,
            Statistics=['Average']
        )

        response_out = cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='NetworkOut',
            Dimensions=[
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                },
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=60,
            Statistics=['Average']
        )

        data_points_in = response_in['Datapoints']
        data_points_out = response_out['Datapoints']

        network_in = data_points_in[-1]['Average'] if data_points_in else 0
        network_out = data_points_out[-1]['Average'] if data_points_out else 0

        return {
            'NetworkIn': network_in,
            'NetworkOut': network_out
        }

    def status_all_rds_instances(self, instances: list = []) -> list[dict]:
        rds = boto3.client('rds')
        rds_info_list = []

        try:
            describe_db_instances = rds.describe_db_instances()
            for db_instance in describe_db_instances['DBInstances']:
                if not instances or (db_instance['DBInstanceIdentifier'] in instances):
                    instance_info = {
                        'RDS_Identifier': db_instance['DBInstanceIdentifier'],
                        'Status': db_instance['DBInstanceStatus'],
                        'Class': db_instance['DBInstanceClass'],
                        'EngineVersion': db_instance['EngineVersion']
                    }

                    rds_info_list.append(instance_info)

        except Exception as e:
            return f'오류 발생: {e}'

        # return '\n'.join(rds_info_list)
        return rds_info_list

    def status_all_auto_scaling_groups(self, groups: list = []) -> list[dict]:
        autoscaling = boto3.client('autoscaling')
        asg_info_list = []

        try:
            describe_auto_scaling_groups = autoscaling.describe_auto_scaling_groups()
            for asg in describe_auto_scaling_groups['AutoScalingGroups']:
                if not groups or asg['AutoScalingGroupName'] in groups:
                    asg_info = {
                        'ASG_NAME': asg['AutoScalingGroupName'],
                        'Instances': len(asg['Instances']),
                        'DesiredCapacity': asg['DesiredCapacity'],
                        'MinSize': asg['MinSize'],
                        'MaxSize': asg['MaxSize'],
                        'DefaultCooldown': asg['DefaultCooldown']
                    }

                    asg_info_list.append(asg_info)

        except Exception as e:
            return f'오류 발생: {e}'

        return asg_info_list

    ## ALL Resources
    def status_all_resources(self) -> str:
        """모든 인스턴스의 상태를 확인"""
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.status_all_ec2_instances)
            rds_future = executor.submit(self.status_all_rds_instances)
            asg_future = executor.submit(self.status_all_auto_scaling_groups)

            ec2_output = self.format_output(ec2_future.result())
            rds_output = self.format_output(rds_future.result())
            asg_output = self.format_output(asg_future.result())

        return f"{ec2_output}\n\n{rds_output}\n\n{asg_output}"
        
    def start_all_resources(self) -> str:
        """모든 인스턴스를 시작합니다."""
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.manage_ec2_instance, 'start')
            rds_future = executor.submit(self.manage_rds_instance, 'start')
            asg_future = executor.submit(self.update_auto_scaling_group_capacity, default_desired_capacity=1)

            ec2_future.result()
            rds_future.result()
            asg_future.result()

        return '모든 리소스를 시작합니다.'

    def stop_all_resources(self) -> str:
        """모든 인스턴스를 중지합니다."""
        with concurrent.futures.ThreadPoolExecutor() as executor:
            ec2_future = executor.submit(self.manage_ec2_instance, 'stop')
            rds_future = executor.submit(self.manage_rds_instance, 'stop')
            asg_future = executor.submit(self.update_auto_scaling_group_capacity, default_desired_capacity=0)

            ec2_future.result()
            rds_future.result()
            asg_future.result()

        return '모든 리소스를 중지했습니다.'

class IAMPolicyManager:
    """IAM 정책을 관리하는 클래스입니다.

    Parameters:
        role_names (list[str]): IAM 역할 이름의 목록
        logger (logging.Logger): 로깅을 위한 Logger
    """
    def __init__(self, role_names: list[str], logger: logging.Logger):
        self.logger = logger
        self.role_names = role_names
        self.iam_client = boto3.client('iam')
        self.policies = [
            'arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy',
            'arn:aws:iam::aws:policy/AmazonSSMFullAccess',
            'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
        ]

        self.attach_policies()

    def attach_policies(self):
        """Role에 정책을 추가합니다."""
        for role_name in self.role_names:
            attached_policies = self.list_attached_policies(role_name)
            attached_policy_arns = {policy['PolicyArn'] for policy in attached_policies}

            for policy_arn in self.policies:
                if policy_arn not in attached_policy_arns:
                    try:
                        self.iam_client.attach_role_policy(
                            RoleName=role_name,
                            PolicyArn=policy_arn
                        )
                        self.logger.debug(f'{role_name}에 정책 추가됨: {policy_arn}')
                    except Exception as e:
                        self.logger.error(f'{role_name}에 정책 추가 실패: {policy_arn}, 오류: {e}')

    def list_attached_policies(self, role_name):
        try:
            response = self.iam_client.list_attached_role_policies(
                RoleName=role_name
            )
            return response['AttachedPolicies']
        except Exception as e:
            self.logger.error(f'{role_name} 정책 목록 조회 실패, 오류: {e}')
            return []
