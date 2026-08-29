import bcrypt from "bcrypt";

const password = process.argv[2] ?? "password123";
console.log(bcrypt.hashSync(password, 10));
