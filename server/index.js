import dotenv from 'dotenv';
import express from 'express';
import DBAdapter, {DB_ERROR_TYPE_CLIENT} from './adapters/DBAdapter.js';

dotenv.config({
    path: './server/.env'
});

const {
    ET_APP_HOST,
    ET_APP_PORT,
    ET_DB_HOST,
    ET_DB_PORT,
    ET_DB_NAME,
    ET_DB_USER_LOGIN,
    ET_DB_USER_PASSWORD,
} = process.env;

const serverApp = express();
const dbAdapter = new DBAdapter({
    dbHost: ET_DB_HOST,
    dbPort: ET_DB_PORT,
    dbName: ET_DB_NAME,
    dbUserLogin: ET_DB_USER_LOGIN,
    dbUserPassword: ET_DB_USER_PASSWORD
});

// middleware - log req
serverApp.use('*', (req, res, next) => {
    console.log(
        new Date().toISOString(),
        req.method,
        req.originalUrl
    );
    next();
});

//another middlewares
serverApp.use('/api/v1/tasks', express.json());
serverApp.use('/api/v1/employee', express.json());
serverApp.use('/api/v1/employee/:employeeID', express.json());
serverApp.use('/api/v1/tasks/:taskID', express.json());

serverApp.get('/api/v1/employee', async (req, res) => {
    try
    {
        const [dbTasks, dbEmployee] = await Promise.all([
            dbAdapter.getTasks(),
            dbAdapter.getEmployee()
        ]);
        const tasks = dbTasks.map(
            ({id, employee_id, equipment_name, equipment_id, start_date, end_date}) =>
            (
                start_date.setHours(start_date.getHours() + 3),
                end_date.setHours(end_date.getHours() + 3),
            {
                taskID: id,
                employeeID: employee_id,
                equipmentName: equipment_name,
                equipmentID: equipment_id,
                startDate: start_date.toISOString().split('T')[0],
                endDate: end_date.toISOString().split('T')[0]
            })
        );
        const employee = dbEmployee.map(
            ({id, full_name, position}) => ({
                employeeID: id,
                employeeName: full_name,
                employeePosition: position,
                tasks: tasks.filter(task => task.employeeID === id)
            })
        );

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({employee});
    }
    catch (err)
    {
        res.statusCode = 500;
        res.statusMessage = 'Internal Server Error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Error while getting Employee ${err.error || err.message}`
        });
    }
});

serverApp.get('/', async (req, res) => {
    res.statusCode = 200;
    res.statusMessage = "OK";
    res.sendFile("/Users/anastasiachemlyova/Desktop/EquipmentTesting/client/index.html");
});

serverApp.use("/", express.static('./client'));

serverApp.get('/api/v1/equipment', async (req, res) => {
    try
    {
        const dbEquipment = await dbAdapter.getEquipment();
        const equipment = dbEquipment.map(
            ({id, name}) =>
            ({
                id: id,
                name: name
            })
        );
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({equipment});
    }
    catch (err)
    {
        res.statusCode = 500;
        res.statusMessage = 'Internal Server Error';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Error while getting Equipment ${err.error || err.message}`
        });
    }
});

serverApp.post('/api/v1/employee', async (req, res) => {
    try
    {
        console.log(req.body);
        const
        {
            employeeName,
            employeePosition
        } = req.body;

        const employeeID = crypto.randomUUID();

        await dbAdapter.addEmployee({
            id: employeeID,
            name: employeeName,
            position: employeePosition,
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({employeeID});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Add employee error ${err.error || err.message}`
        });
    }
});

serverApp.post('/api/v1/tasks', async (req, res) => {
    try
    {
        console.log(req.body);
        const
        {
            employeeID,
            equipmentID,
            startDate,
            endDate
        } = req.body;
        const taskID = crypto.randomUUID();

        await dbAdapter.addTask({
            id: taskID,
            employeeID: employeeID,
            equipmentID: equipmentID,
            startDate: startDate,
            endDate: endDate
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({taskID:taskID, statusCode: res.statusCode});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        let d = new Date();
        d.setHours(d.getHours() + 3);
        res.json({
            timestamp: d.toISOString(),
            statusCode: res.statuscode,
            message: `Add task error ${err.error || err.message}`,
            id: err.taskID
        });
    }

});

serverApp.patch('/api/v1/tasks/:taskID', async (req, res) => {
    try
    {
        const
        {
            employeeID,
            equipmentID,
            startDate,
            endDate
        } = req.body;
        const {taskID} = req.params;

        await dbAdapter.updateTask({
            id: taskID,
            employeeID: employeeID,
            equipmentID: equipmentID,
            startDate: startDate,
            endDate: endDate
        });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({taskID:taskID, statusCode: res.statusCode});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Upd task error ${err.message || err.error}`,
            id: err.taskID
        });
    }
});

serverApp.patch('/api/v1/employee/:employeeID', async (req, res) => {
    try
    {
        const
        {
            updatedEmployeeName
        } = req.body;
        const {employeeID} = req.params;

        await dbAdapter.updateEmployee({
            id: employeeID,
            updatedEmployeeName: updatedEmployeeName
        });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({employeeID:employeeID, statusCode: res.statusCode});
   }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Upd employee error ${err.message || err.error}`,
            id: err.taskID
        });
    }
});

serverApp.delete('/api/v1/tasks/:taskID', async (req, res) => {

    try
    {
        const {taskID} = req.params;

        await dbAdapter.deleteTask({
            id: taskID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete task error ${err.message || err.error}`
        });
    }
});

serverApp.delete('/api/v1/employee/:employeeID', async (req, res) => {

    try
    {
        const {employeeID} = req.params;

        await dbAdapter.deleteEmployee({
            id: employeeID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Delete employee error ${err.message || err.error}`
        });
    }
});

serverApp.patch('/api/v1/employee', async (req, res) => {
    try
    {
        const
        {
            taskID,
            dstEmployeeID
        } = req.body;

        await dbAdapter.updateTask({
            id: taskID,
            employeeID: dstEmployeeID
        });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({employeeID: dstEmployeeID, statusCode: res.statusCode});
    }
    catch (err)
    {
        switch(err.type)
        {
            case DB_ERROR_TYPE_CLIENT:
                res.statusCode = 400;
                res.statusMessage = 'Bad Request';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = "Internal serv err";
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Move task error ${err.message || err.error}`,
            id: err.taskID
        });
    }
});

serverApp.listen(Number(ET_APP_PORT), ET_APP_HOST, async () => {
    try
    {
        await dbAdapter.connect();
    }
    catch (err)
    {
        console.log('TaskManager is shutting down!');
        process.exit(100);
    }
    console.log(`ET APP SERVER started (${ET_APP_HOST}:${ET_APP_PORT})`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    serverApp.close(async () => {
        await dbAdapter.disconnect();
        console.log('DB CLOSED');
    });
});