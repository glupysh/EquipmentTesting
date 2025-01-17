import pg from 'pg';

const DB_ERROR_TYPE_CLIENT = 'DB_ERROR_TYPE_CLIENT';
const DB_ERROR_TYPE_INTERNAL = 'DB_ERROR_TYPE_INTERNAL';

export {
    DB_ERROR_TYPE_CLIENT,
    DB_ERROR_TYPE_INTERNAL
};

export default class DBAdapter {
    #dbHost = '';
    #dbPort = -1;
    #dbName = '';
    #dbUserLogin = '';
    #dbUserPassword = '';
    #dbClient = null;


    constructor({
        dbHost,
        dbPort,
        dbName,
        dbUserLogin,
        dbUserPassword
    })
    {
        this.#dbHost = dbHost;
        this.#dbPort = dbPort;
        this.#dbName = dbName;
        this.#dbUserLogin = dbUserLogin;
        this.#dbUserPassword = dbUserPassword;
        this.#dbClient = new pg.Client({
            host: this.#dbHost,
            port: this.#dbPort,
            database: this.#dbName,
            user: this.#dbUserLogin,
            password: this.#dbUserPassword
        });
    }

    async connect()
    {
        try
        {
            await this.#dbClient.connect();
            console.log(`Successfully connected to DB ${this.#dbName}`);
        }
        catch (err)
        {
            console.error(`Could not connect to DB ${this.#dbName} by ${err}`);
            return Promise.reject(err);
        }
    }

    async disconnect()
    {
        await this.#dbClient.end();
        console.log(`Disconnected from DB ${this.#dbName}`);
    }

    async getTasks()
    {
        try
        {
            const tasksData = await this.#dbClient.query(
                `SELECT task.id, employee_id, name AS equipment_name, equipment_id, start_date, end_date
                FROM task
                JOIN equipment ON (equipment_id = equipment.id)
                ORDER BY start_date;`
            );
            return tasksData.rows;
        }
        catch (err)
        {
            console.error(`DB error: getting tasks  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getEquipment()
    {
        try
        {
            const equipmentData = await this.#dbClient.query(
                `SELECT *
                FROM equipment;`
            );
            return equipmentData.rows;
        }
        catch (err)
        {
            console.error(`DB error: getting equipment ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async getEmployee()
    {
        try
        {
            const employeeData = await this.#dbClient.query(
                'SELECT * FROM employee ORDER BY position ASC;'
            );
            return employeeData.rows;
        }
        catch (err)
        {
            console.error(`DB error while getting employee: ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }
    async addEmployee({id, name, position = -1})
    {
        if (!id || !name || position === -1)
        {
            const errMsg = `DB error wrong parameter for adding employee list ${id}, ${name}, ${position}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            const employeePos = await this.#dbClient.query(
                `SELECT id FROM employee WHERE position = $1;`,
                [position]
            );

            if (employeePos.rows.length !== 0)
            {
                const errMsg = `DB error: Position ${position} already exist`;
                console.error(errMsg);
                return Promise.reject({
                    type: DB_ERROR_TYPE_CLIENT,
                    error: new Error(errMsg)
                });
            }
            await this.#dbClient.query(
                `INSERT INTO employee VALUES ($1, $2, $3);`,
                [id, name, position]
            );
        }
        catch (err)
        {
            console.error(`DB error: add employee  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async addTask({id, employeeID, equipmentID, startDate, endDate})
    {
        if (!id || !employeeID || !equipmentID || !startDate || !endDate)
        {
            const errMsg = `DB error wrong parameter for adding task ${id}, ${employeeID}, ${equipmentID}, ${startDate}, ${endDate}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            const equipmentTaskDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND equipment_id = $3 AND NOT ($1 > end_date OR $2 < start_date);`,
                [startDate, endDate, equipmentID, id]
            );

            const equipmentEmployeeDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND employee_id = $3 AND NOT ($1 > end_date OR $2 < start_date);`,
                [startDate, endDate, employeeID, id]
            );
            if (equipmentTaskDate.rows.length !== 0 || equipmentEmployeeDate.rows.length !== 0)
            {
                let errMsg = `DB error: equipment with ID ${equipmentID} already booked on this period`;
                if (equipmentEmployeeDate.rows.length !== 0)
                    errMsg = `DB error: employee with ID ${employeeID} already working on this period`;
                console.error(errMsg);
                return Promise.reject({
                    type: DB_ERROR_TYPE_CLIENT,
                    error: new Error(errMsg),
                    taskID: equipmentTaskDate.rows.concat(equipmentEmployeeDate.rows)
                });
            }

            await this.#dbClient.query(
                `INSERT INTO task VALUES ($1, $2, $3, $4, $5);`,
                [id, employeeID, equipmentID, startDate, endDate]
            );
        }
        catch (err)
        {
            console.error(`DB error: add task  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }

    }

    async updateTask({id, employeeID, equipmentID, startDate, endDate})
    {
        if (!id || (!employeeID && !equipmentID && !startDate && !endDate))
        {
            const errMsg = `DB error wrong parameter for editing task ${id}, ${employeeID}, ${equipmentID}, ${startDate}, ${endDate}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            const {
                rows: [
                    {
                        employee_id: id1,
                        equipment_id:  id2,
                        start_date: d1,
                        end_date: d2
                    }
                ]
            } = await this.#dbClient.query(
                `SELECT * FROM task where ID = $1;`,
                [id]
            );
            if (!employeeID)
                employeeID = id1;
            if (!equipmentID)
                equipmentID = id2;
            if (!startDate)
                startDate = d1;
            if (!endDate)
                endDate = d2;

            const equipmentTaskDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND equipment_id = $3 AND NOT ($1 > end_date OR $2 < start_date);`,
                [startDate, endDate, equipmentID, id]
            );

            const equipmentEmployeeDate = await this.#dbClient.query(
                `SELECT id
                FROM task
                WHERE id != $4 AND employee_id = $3 AND NOT ($1 > end_date OR $2 < start_date);`,
                [startDate, endDate, employeeID, id]
            );
            if (equipmentTaskDate.rows.length !== 0 || equipmentEmployeeDate.rows.length !== 0)
            {
                let errMsg = `DB error: equipment with ID ${equipmentID} already booked on this period`;
                if (equipmentEmployeeDate.rows.length !== 0)
                    errMsg = `DB error: employee with ID ${employeeID} already working on this period`;
                console.error(errMsg);
                return Promise.reject({
                    type: DB_ERROR_TYPE_CLIENT,
                    error: new Error(errMsg),
                    taskID: equipmentTaskDate.rows.concat(equipmentEmployeeDate.rows)
                });
            }

            await this.#dbClient.query(`
                UPDATE task
                SET employee_id = $2, equipment_id = $3, start_date = $4, end_date = $5
                WHERE id = $1;`,
                [id, employeeID, equipmentID, startDate, endDate]
            );
        }
        catch (err)
        {
            console.error(`DB error: upd task  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async deleteTask({id})
    {
        if (!id)
        {
            const errMsg = `DB error wrong parameter for deleting task ${id}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            await this.#dbClient.query(
                `DELETE FROM task WHERE id = $1`,
                [id]
            );
        }
        catch (err)
        {
            console.error(`DB error: delete task  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async deleteEmployee({id})
    {
        if (!id)
        {
            const errMsg = `DB error wrong parameter for deleting employee ${id}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            await this.#dbClient.query(
                `DELETE FROM task WHERE employee_id = $1`,
                [id]
            );

            await this.#dbClient.query(
                `UPDATE employee
                SET position = position -1
                WHERE position > (
                    SELECT position
                    FROM employee
                    WHERE id = $1
                );`,
                [id]
            );

            await this.#dbClient.query(
                `DELETE FROM employee WHERE id = $1`,
                [id]
            );
        }
        catch (err)
        {
            console.error(`DB error: delete employee  ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }

    async updateEmployee({id, updatedEmployeeName})
    {
        console.log(id, updatedEmployeeName);
        if (!id || !updatedEmployeeName)
        {
            const errMsg = `DB error wrong parameter for editing employee ${id}, ${updatedEmployeeName}`;
            console.error(errMsg);
            return Promise.reject({
                type: DB_ERROR_TYPE_CLIENT,
                error: new Error(errMsg)
            });
        }

        try
        {
            await this.#dbClient.query(
                `UPDATE employee SET full_name = $1 WHERE id = $2;`,
                [updatedEmployeeName, id]
            );
        }
        catch (err)
        {
            console.error(`DB error: update employee ${err}`);
            return Promise.reject({
                type: DB_ERROR_TYPE_INTERNAL,
                error: err
            });
        }
    }
}