import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

//just for sample to remember the columns in users table
let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

//provides list of visited countries for 1 user
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ", 
    [currentUserId]
    );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

//gets current user details - color, no. of countries visited
async function checkUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await checkUser();
  console.log(currentUser);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

//adding new user and then add visited countries
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await checkUser();
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//go to add new user page or show details of selected user
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs"); 
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

// insert new user details in users table
app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const newUserName = req.body.name;
  const newUserColor = req.body.color;
  console.log(newUserName);
  console.log(newUserColor);
  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING id;", 
  [newUserName,newUserColor]
  );
  //const id = result.rows[0].id;
  currentUserId = result;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});