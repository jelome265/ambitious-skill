function signup(req) {
  const { email, password } = req.body;
  return createAccount(email, password);
}

module.exports = { signup };
