function formatPhone(usr) {
  const digits = String(usr.phone || '').replace(/\D/g, '');
  return digits.length === 9 ? `+265 ${digits}` : digits;
}

module.exports = { formatPhone };
