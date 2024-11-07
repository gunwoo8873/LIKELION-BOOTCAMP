import os
import requests
import json
import asyncio
import re
import logging
from datetime import datetime
from threading import Thread
from flask import Flask, request
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from utils.logger import LoggerManager
from utils.aws_manager import AWSInstanceController, IAMPolicyManager
from utils.aws_instance_scheduler import BotoScheduler
from utils.slack_button_generator import CommandButtonGenerator
from utils.timer import Timer

app = Flask(__name__)
port = int(os.environ['PORT'])
channel_id = os.environ['CHANNEL_ID']
client = WebClient(token=os.environ['OAUTH_TOKEN'])

logger_manager = LoggerManager(
    name='instance_monitor',
    level=LoggerManager.logger_level[os.environ['LOG_LEVEL'].upper()],
    filename='instance_monitor.log'
)

logger = logger_manager.get_logger()

policy_manager = IAMPolicyManager(
    role_names=['nodes.team1.lion.nyhhs.com', 'masters.team1.lion.nyhhs.com'],
    logger=logger
)

def process_commands(response_url: str, command: str, action_type: str, channel: str):
    if aws_instance_controller.is_working:
        requests.post(response_url, json={'text': '현재 작업 중인 프로세스가 있습니다.'})
        return
    
    aws_instance_controller.is_working = True
    requests.post(response_url, json={'text': f"'{command} {action_type}' 명령어가 시작되었습니다. 작업이 완료되면 결과를 안내해 드리겠습니다."})
    
    # 타이머를 시작합니다.
    timer.start()

    if command.find('/예약-목록') == 0:
        if action_type == 'list':
            response_text = '\n'.join(boto_scheduler.list_jobs())
        elif action_type == 'list_cancel':
            job_id = command.split()
            if len(job_id) == 1:
                response_text = '?'
            else:
                response_text = boto_scheduler.remove_job(command.split()[1])
    elif command.find('/예약') == 0:
        pattern = r'^/예약 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
        if re.match(pattern, command):
            date_time_str = ' '.join(command.split()[1:])
            scheduled_time = datetime.strptime(date_time_str, '%Y-%m-%d %H:%M')

            if action_type == 'all_start':
                boto_scheduler.add_job(aws_instance_controller.start_all_resources, scheduled_time)
                response_text = f"'{command}' 명령어를 {scheduled_time}에 시작합니다."
            elif action_type == 'all_stop':
                boto_scheduler.add_job(aws_instance_controller.stop_all_resources, scheduled_time)
                response_text = f"'{command}' 명령어를 {scheduled_time}에 중지합니다."
            elif action_type == 'custom_start':
                boto_scheduler.add_job(aws_instance_controller.start_custom_all_resources, scheduled_time)
                response_text = f"'{command}' 명령어를 {scheduled_time}에 시작합니다."
            elif action_type == 'custom_stop':
                boto_scheduler.add_job(aws_instance_controller.stop_custom_all_resources, scheduled_time)
                response_text = f"'{command}' 명령어를 {scheduled_time}에 중지합니다."
            else:
                return False
        else:
            response_text = f"'{command}' 명령어는 형식에 맞지 않습니다. 올바른 형식: '/예약 YYYY-MM-DD HH:MM'"
    elif command == '/all-project-instance':
        if action_type == 'start':
            response_text = aws_instance_controller.start_custom_all_resources()
        elif action_type == 'stop':
            response_text = aws_instance_controller.stop_custom_all_resources()
        elif action_type == 'status':
            response_text = aws_instance_controller.status_custom_all_resources()
        else:
            return False
    elif command == '/all-instance':
        if action_type == 'start':
            response_text = aws_instance_controller.start_all_resources()
        elif action_type == 'stop':
            response_text = aws_instance_controller.stop_all_resources()
        elif action_type == 'status':
            response_text = aws_instance_controller.status_all_resources()
        else:
            return False
    elif command == '/all-ec2':
        if action_type == 'start':
            response_text = aws_instance_controller.start_all_ec2_instances()
        elif action_type == 'stop':
            response_text = aws_instance_controller.stop_all_ec2_instances()
        elif action_type == 'status':
            response_text = aws_instance_controller.format_output(
                aws_instance_controller.status_all_ec2_instances()
            )
        else:
            return False
    elif command == '/all-rds':
        if action_type == 'start':
            response_text = aws_instance_controller.start_all_rds_instances()
        elif action_type == 'stop':
            response_text = aws_instance_controller.stop_all_rds_instances()
        elif action_type == 'status':
            response_text = aws_instance_controller.format_output(
                aws_instance_controller.status_all_rds_instances()
            )
        else:
            return False
    elif command == '/all-asg':
        if action_type == 'status':
            response_text = aws_instance_controller.format_output(
                aws_instance_controller.status_all_auto_scaling_groups()
            )
        elif action_type.find('desired_') == 0:
            desired_capacity = int(action_type.split('_')[1])
            response_text = aws_instance_controller.all_update_auto_scaling_group_capacity(desired_capacity)
        else:
            return False
    else:
        logger.error(f'Unknown command: {command}')
        response_text = '알 수 없는 명령입니다.'

    # 타이머를 종료하고 경과 시간을 표시합니다.
    timer.end(f'{command} {action_type}')

    try:
        aws_instance_controller.is_working = False
        client.chat_postMessage(channel=channel, text=response_text)
    except SlackApiError as e:
        error_message = f"'{command}' 실행 중 오류가 발생했습니다. 오류 원인: {str(e)}"
        requests.post(response_url, json={'text': error_message})

@app.after_request
def log_response_info(response):
    logger.info(f'{request.remote_addr} - [{request.method} {request.path}] {response.status_code}')
    return response

@app.route('/team1-slack/commands', methods=['POST'])
def slack_commands():
    command = request.form.get('command')
    text = request.form.get('text')
    response_url = request.form.get('response_url')
    response_message = command_button_generator.generate_buttons(command, text)

    requests.post(response_url, json=response_message)
    return '', 200

@app.route('/team1-slack/interactive-endpoint', methods=['POST'])
def slack_interactive_endpoint():
    payload = json.loads(request.form.get('payload'))
    response_url = payload['response_url']
    channel = payload['channel']['id']
    action_value = payload['actions'][0]['value'].split(',')
    command = action_value[0]
    action_type = action_value[1]

    if action_type == 'cancel':
        requests.post(response_url, json={'text': f"'{command}' 명령어가 성공적으로 취소되었습니다."})
        return '', 200

    thread = Thread(target=process_commands, args=(response_url, command, action_type, channel))
    thread.start()
    return '', 200

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, app.run, '0.0.0.0', port, False)
    loop.run_forever()
