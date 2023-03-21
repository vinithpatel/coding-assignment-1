const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

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

const validateDueDate = (request, response, next) => {
  let { date } = request.query;

  const isValidDate = isValid(new Date(date));

  if (isValidDate) {
    next();
  } else {
    isInvalidQueryFound = true;
    response.status(400);
    response.send("Invalid Due Date");
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
    WHERE status LIKE '%${status}%' 
    AND priority LIKE '%${priority}%' 
    AND category LIKE '%${category}%' 
    AND todo LIKE '%${search_q}%' 
     ;
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

//GET todo with specific date API
app.get("/agenda/", validateDueDate, async (request, response) => {
  const { date } = request.query;
  const formatedDate = format(new Date(date), "yyyy-MM-dd");

  const getTodoQuery = `
        SELECT *
        FROM todo
        WHERE STRFTIME(due_date) = '${formatedDate}';
    `;

  const dbResponse = await db.all(getTodoQuery);
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

  response.send(jsResponse);
});

//create todo API
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const createTodoQuery = `
        INSERT INTO todo( id, todo , priority, status, category, due_date )
        VALUES(
            ${id},
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${dueDate}'
        );
    `;

  const dbResponse = await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

//update specific todo API
app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;

  if (status !== undefined) {
    const updateStatusQuery = `
            UPDATE todo
            SET 
                status = '${status}'
            WHERE id = ${todoId};
        `;
    const dbResponse = await db.run(updateStatusQuery);
    response.send("Status Updated");
  } else if (priority !== undefined) {
    const updatePriorityQuery = `
            UPDATE todo
            SET 
                priority = '${priority}'
            WHERE id = ${todoId};
        `;
    const dbResponse = await db.run(updatePriorityQuery);
    response.send("Priority Updated");
  } else if (todo !== undefined) {
    const updateTodoQuery = `
            UPDATE todo
            SET 
                todo = '${todo}'
            WHERE id = ${todoId};
        `;
    const dbResponse = await db.run(updateTodoQuery);
    response.send("Todo Updated");
  } else if (category !== undefined) {
    const updateCategoryQuery = `
            UPDATE todo
            SET 
                category = '${category}'
            WHERE id = ${todoId};
        `;
    const dbResponse = await db.run(updateCategoryQuery);
    response.send("Category Updated");
  } else if (dueDate !== undefined) {
    const updateDateQuery = `
            UPDATE todo
            SET 
                due_date = '${dueDate}'
            WHERE id = ${todoId};
        `;
    const dbResponse = await db.run(updateDateQuery);
    response.send("Due Date Updated");
  }
});
