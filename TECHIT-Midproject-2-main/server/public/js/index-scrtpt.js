function serFormAction(id) {
    document.getElementById('request--btn').action = `/${id}`;
}

function handleBButtonEvent() {
    event.preventDefault();
    const id = event.target.id;
    serFormAction(id);
    document.getElementById('request--btn').submit();
}

window.onload = function() {
    const buttons = document.querySelectorAll('.head__menu--btn');
    buttons.forEach(button => {
        button.addEventListener('click', preventDefault);
    });
};