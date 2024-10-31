// frontend/public/js/register.js

document.getElementById('registerForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const phone_num = document.getElementById('phone_num').value;
    const address = document.getElementById('address').value;

    const data = {
        email,
        name,
        password,
        role,
        phone_num,
        address
    };

    try {
        const response = await fetch('/api/auth/register/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert('회원가입 성공!');
            window.location.href = '/login'; // 회원가입 후 로그인 페이지로 이동
        } else {
            alert('회원가입 실패: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('회원가입 처리 중 오류가 발생했습니다.');
    }
});
