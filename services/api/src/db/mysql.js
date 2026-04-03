require("dotenv").config({ path: require("path").resolve(__dirname, "../../../../.env") });
const mysql = require("mysql2");

const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect((err) => {
  if (err) {
    console.error("Error:", err);
    return;
  }

  console.log("Conectado");
});