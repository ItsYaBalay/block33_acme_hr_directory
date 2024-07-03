const pg = require("pg");
const express = require("express");
const client = new pg.Client(
  process.env.DATABASE_URL || "postgres://localhost/acme_hr"
);
const app = express();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(require("morgan")("dev"));

app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
            SELECT * FROM employees;
        `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});
app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `
            SELECT * FROM departments;
        `;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});
app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
            INSERT INTO employees(name, department_id)
            VALUES($1, $2)
            RETURNING *
        `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
            DELETE FROM employees
            WHERE id=$1
        `;
    await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});
app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
            UPDATE employees
            SET name=$1, department_id=$2, updated_at=now()
            WHERE id=$3 RETURNING *
        `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

app.use((error, req, res, next) => {
    res.status(res.status || 500).send({ error: error});
})

const init = async () => {
  await client.connect();
  app.listen(port, () => console.log(`listening on port ${port}`));
  console.log("connected to database");
  let SQL = `
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS departments;
        CREATE TABLE departments(
            id SERIAL PRIMARY KEY,
            name VARCHAR(255)
        );
        CREATE TABLE employees(
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES departments(id) NOT NULL
        );
    `;
  await client.query(SQL);
  console.log("tables created");
  SQL = `
        INSERT INTO departments(name) VALUES('IT');
        INSERT INTO departments(name) VALUES('Sales');
        INSERT INTO departments(name) VALUES('Accounting');
        
        INSERT INTO employees(name, department_id) VALUES('Bob', (SELECT id FROM departments WHERE name='IT'));
        INSERT INTO employees(name, department_id) VALUES('Joe', (SELECT id FROM departments WHERE name='Sales'));
        INSERT INTO employees(name, department_id) VALUES('Bill', (SELECT id FROM departments WHERE name='Accounting'));
    `;
  await client.query(SQL);
};

init();
