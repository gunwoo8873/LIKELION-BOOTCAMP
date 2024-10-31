document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;

    console.log('Submitting login form:', email, password);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Response received:', response);

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                alert('로그인 성공!');
                console.log('User data:', result.user);
                sessionStorage.setItem('userId', result.user.id); // user_id를 sessionStorage에 저장
            } else {
                alert('로그인 실패: ' + result.message);
            }
        } else {
            const text = await response.text();
            console.error('Error:', text);
            alert('로그인 실패: ' + text);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
    }
});