const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
var isDate = require("date-fns/isDate");

const app = express();
app.use(express.json());
module.exports = app;

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Started At http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const validateQueryParameters = (request, response, next) => {
  let { status, priority, category, date } = request.query;

  let isInvalidQueryFound = false;
  if (status !== undefined) {
    status = status.replace("%20", " ");
  }

  if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
    isInvalidQueryFound = true;
  }

  if (
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW" &&
    priority !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
    isInvalidQueryFound = true;
  }

  if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== undefined
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
    isInvalidQueryFound = true;
  }

  if (!isInvalidQueryFound) {
    next();
  }
};

//GET todos API
app.get("/todos/", validateQueryParameters, async (request, response) => {
  let {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;

  status = status.replace("%20", " ");
  const getTodosQuery = `
    SELECT *
    FROM todo
    WHERE status LIKE '%${status}%' AND priority LIKE '%${priority}%' AND category LIKE '%${category}%' AND todo LIKE '%${search_q}%';
  `;

  const dbResponse = await db.all(getTodosQuery);
  const jsResponse = dbResponse.map((eachTodo) => {
    return {
      id: eachTodo.id,
      todo: eachTodo.todo,
      priority: eachTodo.priority,
      status: eachTodo.status,
      category: eachTodo.category,
      dueDate: eachTodo.due_date,
    };
  });
  console.log("handler");
  response.send(jsResponse);
});

//GET todo API
app.get("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT *
        FROM todo
        WHERE id = ${todoId};
    `;
  const dbResponse = await db.get(getTodoQuery);
  response.send({
    id: dbResponse.id,
    todo: dbResponse.todo,
    priority: dbResponse.priority,
    status: dbResponse.status,
    category: dbResponse.category,
    dueDate: dbResponse.due_date,
  });
});

//Delete todo API

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM todo
        WHERE id=${todoId};
    `;
  const dbResponse = await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
