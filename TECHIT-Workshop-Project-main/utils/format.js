function formatNumber(number) {
    return `${number}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getCurrentDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

module.exports.formatNumber = formatNumber;
module.exports.getCurrentDateString = getCurrentDateString;