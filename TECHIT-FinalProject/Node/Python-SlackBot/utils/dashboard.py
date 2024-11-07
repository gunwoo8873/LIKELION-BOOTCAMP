import streamlit as st
import pandas as pd
import plotly.express as px
import os
import concurrent.futures
from sqlalchemy import create_engine
from datetime import datetime, timedelta, timezone

st.set_page_config(
    page_title='AWeSome 대시보드',
    page_icon='😎',
    layout='wide',
    initial_sidebar_state='collapsed'
)

# mysql 연결 설정
mysql_config = {
    'host': os.environ['MYSQL_HOST'],
    'port': os.environ['MYSQL_PORT'],
    'database': os.environ['MYSQL_DATABASE'],
    'user': os.environ['MYSQL_USER'],
    'password': os.environ['MYSQL_PASSWORD']
}

def get_engine():
    return create_engine(f"mysql+pymysql://{mysql_config['user']}:{mysql_config['password']}@{mysql_config['host']}:{mysql_config['port']}/{mysql_config['database']}")

# 데이터베이스에서 데이터 가져오기
@st.cache_data(ttl=300)  # 5분 캐시
def load_data(start_date = None, end_date = None):
    engine = get_engine()

    if start_date and end_date:
        start_date = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc) - timedelta(hours=9)
        end_date = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc) - timedelta(hours=9)
    else:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)

    # UTC -> KST
    query_ec2 = f"""
    SELECT ec2_id, state, 
        CONVERT_TZ(launch_time, '+00:00', '+09:00') AS 'Launch Time (KST)',
        CONVERT_TZ(timestamp, '+00:00', '+09:00') AS '타임스탬프 (KST)', 
        instance_type, private_ip, public_ip,
        cpu_utilization, ram_utilization,
        network_in_utilization, network_out_utilization, name
    FROM ec2_status
    WHERE timestamp >= '{start_date.strftime('%Y-%m-%d %H:%M:%S')}' AND timestamp <= '{end_date.strftime('%Y-%m-%d %H:%M:%S')}'
    """
    
    query_rds = f"""
    SELECT rds_identifier, status, class, engine_version, 
        CONVERT_TZ(timestamp, '+00:00', '+09:00') AS '타임스탬프 (KST)'
    FROM rds_status
    WHERE timestamp >= '{start_date.strftime('%Y-%m-%d %H:%M:%S')}' AND timestamp <= '{end_date.strftime('%Y-%m-%d %H:%M:%S')}'
    """
    
    query_asg = f"""
    SELECT asg_name, instances, desired_capacity, min_size, max_size, default_cooldown, 
        CONVERT_TZ(timestamp, '+00:00', '+09:00') AS '타임스탬프 (KST)'
    FROM asg_status
    WHERE timestamp >= '{start_date.strftime('%Y-%m-%d %H:%M:%S')}' AND timestamp <= '{end_date.strftime('%Y-%m-%d %H:%M:%S')}'
    """

    with concurrent.futures.ThreadPoolExecutor() as executor:
        df_ec2_future = executor.submit(pd.read_sql, query_ec2, engine)
        df_rds_future = executor.submit(pd.read_sql, query_rds, engine)
        df_asg_future = executor.submit(pd.read_sql, query_asg, engine)

        df_ec2 = df_ec2_future.result()
        df_rds = df_rds_future.result()
        df_asg = df_asg_future.result()

    return df_ec2, df_rds, df_asg

# 경고/위험
def add_warning_labels(df):
    df['CPU 경고'] = df['CPU 사용량'].apply(lambda x: '위험' if x >= 90 else ('경고' if x >= 75 else '정상'))
    df['RAM 경고'] = df['RAM 사용량'].apply(lambda x: '위험' if x >= 90 else ('경고' if x >= 75 else '정상'))
    return df

# 시간 필터 함수
def filter_data_by_time(df, time_range, start_date=None, end_date=None):
    if time_range == '직접 설정' and start_date and end_date:
        end_date = datetime.combine(end_date, datetime.max.time())
        return df[(df['타임스탬프 (KST)'] >= pd.Timestamp(start_date)) & (df['타임스탬프 (KST)'] <= pd.Timestamp(end_date))]
    
    now = datetime.now()
    time_filter = {
        '1시간': now - timedelta(hours=1),
        '3시간': now - timedelta(hours=3),
        '12시간': now - timedelta(hours=12),
        '1일': now - timedelta(days=1),
        '3일': now - timedelta(days=3),
        '1주': now - timedelta(weeks=1),
        '3주': now - timedelta(weeks=3)
    }
    return df[df['타임스탬프 (KST)'] >= time_filter[time_range]]

# 데이터 정렬 함수
def sort_data(df, column, ascending=True):
    return df.sort_values(by=column, ascending=ascending)

st.title('AWeSome팀 인스턴스 대시보드')
st.header('')  # 간격

# 시간 선택
st.markdown("""
### 시간 범위 선택

시간 범위를 선택해주세요. 아래의 옵션 중 하나를 선택할 수 있습니다:
- **1시간**: 최근 1시간의 데이터
- **3시간**: 최근 3시간의 데이터
- **12시간**: 최근 12시간의 데이터
- **1일**: 최근 1일의 데이터
- **3일**: 최근 3일의 데이터
- **1주**: 최근 1주의 데이터
- **3주**: 최근 3주의 데이터
- **직접 설정**: 특정 날짜 범위를 직접 선택할 수 있습니다.

`직접 설정`을 선택하면 시작 날짜와 종료 날짜를 지정하여 원하는 기간의 데이터를 분석할 수 있습니다.<br>
기본값으로 최근 7일의 데이터가 설정됩니다.
""", unsafe_allow_html=True)
time_range = st.selectbox('시간 범위 선택', ['1시간', '3시간', '12시간', '1일', '3일', '1주', '3주', '직접 설정'])
start_date = None
end_date = None

# 날짜 선택 옵션
if time_range == '직접 설정':
    start_date = st.date_input('시작 날짜', value=(datetime.now() - timedelta(days=7)).date())
    end_date = st.date_input('종료 날짜', value=datetime.now().date())

df_ec2, df_rds, df_asg = load_data(start_date, end_date)  # 데이터 로드
df_ec2 = df_ec2.rename(columns={
    'cpu_utilization': 'CPU 사용량',
    'ram_utilization': 'RAM 사용량',
    'network_in_utilization': '네트워크 수신 트래픽',
    'network_out_utilization': '네트워크 송신 트래픽'
})
df_ec2 = add_warning_labels(df_ec2)  # EC2 경고/위험 라벨을 추가

# EC2 그래프 출력
st.header('')  # 간격
st.header('EC2 상태')

sort_column_ec2 = st.selectbox('Sort EC2 by', ['CPU 사용량', 'RAM 사용량', '네트워크 수신 트래픽', '네트워크 송신 트래픽', 'state', 'ec2_id'])  # 정렬 및 필터링 옵션
sort_ascending_ec2 = st.checkbox('Ascending Order (EC2)', value=True)

df_ec2_filtered = filter_data_by_time(df_ec2, time_range, start_date, end_date)  # 시간 필터 적용 (선택된 날짜 또는 미리 정의된 기간에 맞춰 필터링)
df_ec2_sorted = sort_data(df_ec2_filtered, sort_column_ec2, sort_ascending_ec2)  # 정렬 적용
graph_type_ec2 = st.selectbox('EC2 그래프 타입 선택', ['Scatter Plot', 'Violin Plot'])  # 그래프 타입 선택

def format_traffic(value: float) -> str:
    """주어진 트래픽 값을 적절한 단위로 변환하여 문자열로 반환합니다.

    Args:
        value (float): 변환할 트래픽 값 (바이트 단위).

    Returns:
        str: 변환된 트래픽 값과 해당 단위 (예: '1.23 G').
    """
    units = [('PB', 1e15), ('T', 1e12), ('G', 1e9), ('M', 1e6), ('K', 1e3)]
    for unit, threshold in units:
        if value >= threshold:
            return f'{value / threshold:.2f} {unit}'
    return f'{value:.2f} B'
    
df_ec2_sorted['네트워크 수신 트래픽 (형식)'] = df_ec2_sorted['네트워크 수신 트래픽'].apply(format_traffic)
df_ec2_sorted['네트워크 송신 트래픽 (형식)'] = df_ec2_sorted['네트워크 송신 트래픽'].apply(format_traffic)

if graph_type_ec2 == 'Scatter Plot':
    fig_ec2 = px.scatter(
        df_ec2_sorted, 
        x='타임스탬프 (KST)',
        y=sort_column_ec2, 
        title=f'EC2 {sort_column_ec2.capitalize()} 시간에 따른 변화 (Scatter Plot)',
        color='ec2_id',
        hover_data=['CPU 사용량', 'RAM 사용량', 'CPU 경고', 'RAM 경고', 'state', 'instance_type', 'private_ip', 'public_ip', 'name', '네트워크 수신 트래픽 (형식)', '네트워크 송신 트래픽 (형식)', '타임스탬프 (KST)'],
        color_discrete_sequence=px.colors.qualitative.Dark2  # Set1, Set2, Dark2, Pastel1
    )
elif graph_type_ec2 == 'Violin Plot':
    fig_ec2 = px.violin(
        df_ec2_sorted,
        y=sort_column_ec2,
        x='ec2_id',
        color='ec2_id',
        box=True,
        points="all",
        title=f'EC2 {sort_column_ec2.capitalize()} 분포 (Violin Plot)',
        labels={'ec2_id': 'EC2 ID'},
        hover_data=['CPU 사용량', 'RAM 사용량', 'CPU 경고', 'RAM 경고', 'state', 'instance_type', 'private_ip', 'public_ip', 'name', '네트워크 수신 트래픽 (형식)', '네트워크 송신 트래픽 (형식)', '타임스탬프 (KST)'],
        color_discrete_sequence=px.colors.qualitative.Dark2
    )
st.plotly_chart(fig_ec2)

# 경고 정보
st.header('')  # 간격
st.subheader("EC2 CPU 및 RAM 경고 상태")

df_warning_filtered = df_ec2_sorted[(df_ec2_sorted['CPU 사용량'] >= 75) | (df_ec2_sorted['RAM 사용량'] >= 75)]
if not df_warning_filtered.empty:
    color_map = {
        '경고': 'yellow',
        '위험': 'red'
    }

    # CPU 경고 Scatter Plot
    fig_cpu_warning = px.scatter(
        df_ec2_sorted[df_ec2_sorted['CPU 사용량'] >= 75],
        x='타임스탬프 (KST)',
        y='CPU 사용량',
        color='CPU 경고',
        title='CPU 경고 상태 (Scatter Plot)',
        hover_data=['CPU 경고', 'RAM 경고', 'CPU 사용량', 'RAM 사용량', 'state', 'instance_type', 'private_ip', 'public_ip', 'name', '네트워크 수신 트래픽 (형식)', '네트워크 송신 트래픽 (형식)'],
        color_discrete_map=color_map
    )
    st.plotly_chart(fig_cpu_warning)

    # RAM 경고 Scatter Plot
    fig_ram_warning = px.scatter(
        df_ec2_sorted[df_ec2_sorted['RAM 사용량'] >= 75],
        x='타임스탬프 (KST)',
        y='RAM 사용량',
        color='RAM 경고',
        title='RAM 경고 상태 (Scatter Plot)',
        hover_data=['CPU 경고', 'RAM 경고', 'CPU 사용량', 'RAM 사용량', 'state', 'instance_type', 'private_ip', 'public_ip', 'name', '네트워크 수신 트래픽 (형식)', '네트워크 송신 트래픽 (형식)'],
        color_discrete_map=color_map
    )
    st.plotly_chart(fig_ram_warning)

    st.write(df_warning_filtered)  # Table
    if (df_warning_filtered['CPU 사용량'] >= 90).any() or (df_warning_filtered['RAM 사용량'] >= 90).any():
        st.error("위험 상태: CPU 또는 RAM 사용량이 90% 이상인 로그가 발견되었습니다!")
    elif (df_warning_filtered['CPU 사용량'] >= 75).any() or (df_warning_filtered['RAM 사용량'] >= 75).any():
        st.warning("주의: CPU 또는 RAM 사용량이 75% 이상인 로그가 있습니다!")
else:
    st.info("모든 인스턴스의 CPU 및 RAM 사용량이 정상 범위에 있습니다.\n\n정기적으로 모니터링하여 성능을 유지해 주세요.")

st.header('')  # 간격
st.header('RDS 상태')

sort_column_rds = st.selectbox('Sort RDS by', ['status', 'class', 'engine_version', 'rds_identifier'])
sort_ascending_rds = st.checkbox('Ascending Order (RDS)', value=True)
df_rds_filtered = filter_data_by_time(df_rds, time_range, start_date, end_date)
df_rds_sorted = sort_data(df_rds_filtered, sort_column_rds, sort_ascending_rds)

# RDS 그래프 출력
fig_rds = px.scatter(
    df_rds_sorted,
    x='타임스탬프 (KST)',
    y=sort_column_rds,
    title=f'RDS {sort_column_rds.capitalize()} 시간에 따른 변화 (Scatter Plot)',
    color='rds_identifier',
    hover_data=['status', 'class', 'engine_version']
)  # 원래 컬럼 이름 사용
st.plotly_chart(fig_rds)

st.header('')  # 간격
st.header('오토스케일링 그룹 상태')

sort_column_asg = st.selectbox('Sort ASG by', ['instances', 'desired_capacity', 'min_size', 'max_size', 'asg_name'])
sort_ascending_asg = st.checkbox('Ascending Order (ASG)', value=True)
df_asg_filtered = filter_data_by_time(df_asg, time_range, start_date, end_date)
df_asg_sorted = sort_data(df_asg_filtered, sort_column_asg, sort_ascending_asg)

# ASG 그래프 출력
fig_asg = px.scatter(
    df_asg_sorted,
    x='타임스탬프 (KST)',
    y=sort_column_asg,
    title=f'ASG {sort_column_asg.capitalize()} 시간에 따른 변화 (Scatter Plot)',
    color='asg_name',
    hover_data=['instances', 'desired_capacity', 'min_size', 'max_size', 'asg_name']
)
st.plotly_chart(fig_asg)

st.header('')  # 간격
st.markdown("""
## 데이터 테이블

이 섹션에서는 그래프에서 시각화된 데이터의 원본을 테이블로 보여줍니다.
""")
st.subheader('EC2 데이터 테이블')
st.dataframe(df_ec2_sorted)

st.subheader('RDS 데이터 테이블')
st.dataframe(df_rds_sorted)

st.subheader('ASG 데이터 테이블')
st.dataframe(df_asg_sorted)
