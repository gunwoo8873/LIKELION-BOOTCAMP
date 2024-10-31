//// User ID
let user_id = document.querySelector("#user__id");
const id_check = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}$/;
const user_id_err = document.querySelector("#id_check_err");

user_id.addEventListener('input', () => {
    if (id_check.test(user_id.value)) {
        user_id_err.innerText = "적합한 아이디 입니다";
    }
    else {
        user_id_err.innerText = "적합한 아이디 입력하세요";
    }
})

//// User Password
let user_ps = document.querySelector("#user__ps");
const ps_check = /^[a-zA-Z0-9!@#$%^&*]{5,19}$/;
const user_ps_err = document.querySelector("#ps_check_err");

user_ps.addEventListener('input', () => {
    if (ps_check.test(user_ps.value)) {
        user_ps_err.innerText = "적합한 패스워드 입니다";
    }
    else {
        user_ps_err.innerText = "적합한 패스워드 입력하세요";
    }
})