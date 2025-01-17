document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

});

let equipmentList = [];

class App
{
    #employees = [];

    deleteEmployee({employeeID})
    {
        const deleteEmployeeIndex = this.#employees.findIndex(employee => employee.employeeID === employeeID);
        if (deleteEmployeeIndex === -1) return;

        this.#employees.splice(deleteEmployeeIndex, 1);
    }

    onDeleteEmployee = async ({employeeID}) => {
        const employee = this.#employees.find(employee => employee.employeeID === employeeID);
        if (!employee)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const employeeIsDeleted = confirm(`Сотрудник '${employee.employeeName}' будет удалён со всеми заявками. Ок?`);
        if (!employeeIsDeleted) return;
        this.deleteEmployee({employeeID});
        document.querySelector(`li[id="${employeeID}"]`).remove();

        const response = await fetch(`/api/v1/employee/${employeeID}`, {
                method: 'DELETE'
            });
    };

    onEditEmployee = async ({employeeID}) => {
        const employee = this.#employees.find(employee => employee.employeeID === employeeID);
        if (!employee)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const updatedEmployeeName = prompt('Введите новое ФИО', employee.employeeName);

        if (!updatedEmployeeName || updatedEmployeeName === employee.employeeName) return;

        employee.employeeName = updatedEmployeeName;

        document.querySelector(`li[id="${employeeID}"] > .employee__header > .employee__header__employee_name`).innerHTML = updatedEmployeeName;

        const response = await fetch(`/api/v1/employee/${employeeID}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    updatedEmployeeName: updatedEmployeeName
                })
            });
        console.log(response);
    };

    onKeyDownEscape = (event) => {
        if (event.key !== 'Escape') return;
        const input = document.getElementById('add-employee-input');
        input.style.display = 'none';
        input.value = '';

        document.getElementById('add-employee-btn').style.display = 'initial';
    };

    onKeyDownEnter = async (event) => {
        if (event.key !== 'Enter') return;
        const input = document.getElementById('add-employee-input');
        if (input.value !== '')
        {
            const response = await fetch("/api/v1/employee", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employeeName: input.value,
                    employeePosition: this.#employees.length
                })
            });

            const data = await response.json();


            const newEmployee = new Employee ({
                employeeID: data.employeeID,
                employeeName: input.value,
                onEditTask: this.onEditTask,
                onDeleteTask: this.onDeleteTask,
                onMoveTask: this.onMoveTask,
                placeNewTask: this.placeNewTask,
                onDeleteEmployee: this.onDeleteEmployee,
                onEditEmployee: this.onEditEmployee
            });
            this.#employees.push(newEmployee);
            newEmployee.render();
        }
        input.value = '';
        input.style.display = 'none';

        document.getElementById('add-employee-btn').style.display = 'initial';


    };

    onEditTask = async ({taskID, employeeID}) => {
        const employee = this.#employees.find(employee => employee.employeeID === employeeID);
        if (!employee)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const task = employee.getTask({taskID});
        task.taskIsEditing = true;
        if (!task)
        {
            console.error('Нет такой заявки');
            return;
        }
        document.querySelector(`li[id="${taskID}"] > ul.task__datas`).remove();
        document.querySelector(`li[id="${taskID}"] > div.task__controls`).remove();
        task.unFix(document.querySelector(`li[id="${taskID}"]`));
    };

    onDeleteTask = async ({taskID, employeeID}) => {
        const employee = this.#employees.find(employee => employee.employeeID === employeeID);
        if (!employee)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const task = employee.getTask({taskID});

        if (!task)
        {
            console.error('Нет такой заявки');
            return;
        }
        let taskIsDeleted = false;
        if (task.taskIsCreated)
             taskIsDeleted = confirm(`Заявка '${task.equipmentName} с ${task.startDate} по ${task.endDate}' будет удалена. Ок?`);
        else
            taskIsDeleted = confirm(`Заявка '${task.equipmentName || task.taskID}' будет удалена. Ок?`);
        if (!taskIsDeleted) return;
        employee.deleteTask({taskID});
        document.querySelector(`li[id="${taskID}"]`).remove();

        const response = await fetch(`/api/v1/tasks/${taskID}`, {
                method: 'DELETE'
            });
        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }
    };

    onMoveTask = async ({taskID, employeeID, direction}) =>
    {
        if (direction !== TaskBtnTypes.MOVE_TASK_FORWARD && direction !== TaskBtnTypes.MOVE_TASK_BACK)
            return;
        const srcEmployeeIndex = this.#employees.findIndex(employee => employee.employeeID === employeeID);
        if (srcEmployeeIndex === -1)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const movingTask = this.#employees[srcEmployeeIndex].getTask({taskID});
        if (!movingTask)
        {
            console.error('Нет такой заявки');
            return;
        }

        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }

        const destEmployeeIndex = direction === TaskBtnTypes.MOVE_TASK_BACK
            ? srcEmployeeIndex - 1
            : srcEmployeeIndex + 1;
        if (destEmployeeIndex === -1 || destEmployeeIndex === this.#employees.length) return;

        const response = await fetch("/api/v1/employee", {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    taskID: taskID,
                    dstEmployeeID: this.#employees[destEmployeeIndex].employeeID
                })
            });
        const data = await response.json();
        if (data.statusCode !== 200)
        {
            alert(`Невозможно переназначить заявку: сотрудник ${this.#employees[destEmployeeIndex].employeeName} уже занят тестированием`);
            data.id.forEach((ids) => document.querySelector(`li[id="${ids.id}"`).classList.add("alert"));

            return;
        }

        this.#employees[srcEmployeeIndex].deleteTask({taskID});
        movingTask.employeeID = this.#employees[destEmployeeIndex].employeeID;
        this.#employees[destEmployeeIndex].addTask({task: movingTask});

        this.placeNewTask({taskID: taskID, employeeID: this.#employees[destEmployeeIndex].employeeID});


    };


    async init()
    {
        document.getElementById('add-employee-btn')
            .addEventListener('click', (event) => {
                event.target.style.display = 'none';

                const input = document.getElementById('add-employee-input');

                input.style.display = 'initial';
                input.focus();
            })
            document.addEventListener('keydown', this.onKeyDownEscape);
            document.addEventListener('keydown', this.onKeyDownEnter);

            const equipment = await fetch(
                "http://localhost:7777/api/v1/equipment",
                {method: "GET"}
            );

            let data = await equipment.json();

            equipmentList = data.equipment;

            const employee = await fetch(
                "http://localhost:7777/api/v1/employee",
                {method: "GET"}
            );

            data = await employee.json();

        data.employee.forEach((employee) => {
            const newEmployee = new Employee({
                employeeID: employee.employeeID,
                employeeName: employee.employeeName,
                onEditTask: this.onEditTask,
                onDeleteTask: this.onDeleteTask,
                onMoveTask: this.onMoveTask,
                placeNewTask: this.placeNewTask,
                onDeleteEmployee: this.onDeleteEmployee,
                onEditEmployee: this.onEditEmployee
            });

            this.#employees.push(newEmployee);
            newEmployee.render();

            employee.tasks.forEach((task) => {
                const newTask = new Task({
                    taskID: task.taskID,
                    employeeID: task.employeeID,
                    equipmentName: task.equipmentName,
                    equipmentID: task.equipmentID,
                    startDate: task.startDate,
                    endDate: task.endDate,
                    onEditTask: this.onEditTask,
                    onDeleteTask: this.onDeleteTask,
                    onMoveTask: this.onMoveTask,
                    placeNewTask: this.placeNewTask
                });
                newTask.taskIsCreated = true;
                newEmployee.tasks.push(newTask);
                newTask.render();
            });
        });
    }

    placeNewTask = ({taskID, employeeID}) =>
    {
        const employee = this.#employees.find(employee => employee.employeeID === employeeID);
        if (!employee)
        {
            console.error('Нет такого сотрудника');
            return;
        }

        const task = employee.getTask({taskID});

        if (!task)
        {
            console.error('Нет такой заявки');
            return;
        }

        const beforeTask = employee.earliestTask(task);

        const movingTaskEl = document.querySelector(`li[id="${taskID}"]`);
        if (!beforeTask)
            document.querySelector(`li[id="${task.employeeID}"] > ul.employee__tasks-list`)
                .appendChild(movingTaskEl);
        else
            document.querySelector(`li[id="${task.employeeID}"] > ul.employee__tasks-list`)
                .insertBefore(movingTaskEl, document.querySelector(`li[id="${beforeTask.taskID}"]`));
    }
}

class Employee
{
    #employeeID = '';
    #employeeName = '';
    #tasks = [];

    constructor({employeeID, employeeName, onEditTask, onDeleteTask, onMoveTask, placeNewTask, onDeleteEmployee, onEditEmployee})
    {
        this.#employeeName = employeeName;
        this.#employeeID = employeeID;
        this.onEditTask = onEditTask;
        this.onDeleteTask = onDeleteTask;
        this.onMoveTask = onMoveTask;
        this.placeNewTask = placeNewTask;
        this.onDeleteEmployee = onDeleteEmployee;
        this.onEditEmployee = onEditEmployee;
    }

    get employeeID() {return this.#employeeID;}

    get employeeName() {return this.#employeeName;}

    set employeeName(newEmployeeName)
    {
       if (typeof newEmployeeName !== 'string') return;
        this.#employeeName = newEmployeeName;
    }

    getTask ({taskID})
    {
        return this.#tasks.find(task => task.taskID === taskID);
    }
    get tasks() {return this.#tasks;}

    addTask({task})
    {
        if (!task instanceof Task) return;
        this.#tasks.push(task);
    }

    deleteTask({taskID})
    {
        const deleteTaskIndex = this.#tasks.findIndex(task => task.taskID === taskID);
        if (deleteTaskIndex === -1) return;

        this.#tasks.splice(deleteTaskIndex, 1);
    }

    earliestTask(insertingTask)
    {
        this.#tasks.sort((task1, task2) => {
            if (!task1.taskIsCreated && task2.taskIsCreated) return 1;
            if (task1.taskIsCreated && !task2.taskIsCreated) return -1;
            let cmp = new Date(insertingTask.startDate);
            task1 = new Date(task1.startDate) - cmp;
            task2 = new Date(task2.startDate) - cmp;
            if (task1 > task2) return 1;
            else if (task1 < task2) return -1;
            return 0;
        });
        let filteredTask = this.#tasks.filter(task => (new Date(task.startDate) > new Date(insertingTask.startDate) || !task.taskIsCreated));
        return filteredTask[0];
    }

    onConstructTask = () => {
        const newTask = new Task({
            taskID: crypto.randomUUID(),
            employeeID: this.#employeeID,
            onEditTask: this.onEditTask,
            onDeleteTask: this.onDeleteTask,
            onMoveTask: this.onMoveTask,
            placeNewTask: this.placeNewTask
        });
        this.#tasks.push(newTask);
        newTask.render();
    };



    render() {
        const employeeEl = document.createElement('li');
        employeeEl.classList.add('employee');
        employeeEl.setAttribute('id', this.#employeeID);

        const headerEl = document.createElement('header');
        headerEl.classList.add('employee__header');

        const spanEl = document.createElement('span');
        spanEl.classList.add('employee__header__employee_name');
        spanEl.innerHTML = this.#employeeName;

        headerEl.appendChild(spanEl);

        const divEl = document.createElement('div');
        divEl.classList.add('employee__header__employee_controls');

        TaskBtnParams.slice(5, 7).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);
            switch(type)
            {
                case TaskBtnTypes.DELETE_STAFF:
                     buttonEl.addEventListener('click', () => this.onDeleteEmployee({
                        employeeID: this.#employeeID
                     }));
                    break;
                case TaskBtnTypes.EDIT_STAFF:
                     buttonEl.addEventListener('click', () =>  this.onEditEmployee({
                         employeeID: this.#employeeID
                     }));

                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            divEl.appendChild(buttonEl);
        });

        headerEl.appendChild(divEl);

        employeeEl.appendChild(headerEl);

        const tasksEl = document.createElement('ul');
        tasksEl.classList.add('employee__tasks-list');

        employeeEl.appendChild(tasksEl);

        const buttonEl = document.createElement('button');
        buttonEl.classList.add('employee__add-task-btn');
        buttonEl.innerHTML = 'Добавить заявку';
        buttonEl.addEventListener('click', this.onConstructTask);

        employeeEl.appendChild(buttonEl);

        const tlListEl = document.querySelector('ul.employees-list');
        tlListEl.insertBefore(employeeEl, tlListEl.children[tlListEl.children.length - 1]);

    }
}

const TaskBtnTypes = Object.freeze({
    EDIT_TASK: 'EDIT_TASK',
    DELETE_TASK: 'DELETE_TASK',
    MOVE_TASK_BACK: 'MOVE_TASK_BACK',
    MOVE_TASK_FORWARD: 'MOVE_TASK_FORWARD',
    ADD_TASK: 'ADD_TASK',
    EDIT_STAFF: 'EDIT_STAFF',
    DELETE_STAFF: 'DELETE_STAFF'
});

const TaskBtnParams = Object.freeze([
    Object.freeze({
        type: TaskBtnTypes.MOVE_TASK_BACK,
        className: 'task-move-back',
        imageSrc: './assets/left-arrow.svg',
        imageAlt: 'Move To Prev'
    }),
    Object.freeze({
        type: TaskBtnTypes.MOVE_TASK_FORWARD,
        className: 'task-move-forward',
        imageSrc: './assets/right-arrow.svg',
        imageAlt: 'Move To Next'
    }),
    Object.freeze({
        type: TaskBtnTypes.EDIT_TASK,
        className: 'task-edit',
        imageSrc: './assets/edit-button.svg',
        imageAlt: 'Edit Task'
    }),
    Object.freeze({
        type: TaskBtnTypes.ADD_TASK,
        className: 'task-add',
        imageSrc: './assets/add-button.svg',
        imageAlt: 'Add Task'
    }),
    Object.freeze({
        type: TaskBtnTypes.DELETE_TASK,
        className: 'task-delete',
        imageSrc: './assets/delete-button.svg',
        imageAlt: 'Delete Task'
    }),
    Object.freeze({
        type: TaskBtnTypes.EDIT_STAFF,
        className: 'employee-edit',
        imageSrc: './assets/edit-button.svg',
        imageAlt: 'Edit Employee'
    }),
    Object.freeze({
        type: TaskBtnTypes.DELETE_STAFF,
        className: 'employee-delete',
        imageSrc: './assets/delete-button.svg',
        imageAlt: 'Delete Employee'
    })
]);

const TaskDataTypes = Object.freeze({
    EQUIPMENT_NAME: 'EQUIPMENT_NAME',
    START_DATE: 'START_DATE',
    END_DATE: 'END_DATE'
});

const dataTypes = [
    TaskDataTypes.EQUIPMENT_NAME,
    TaskDataTypes.START_DATE,
    TaskDataTypes.END_DATE
];

class Task
{
    #taskID = '';
    #equipmentName = '';
    #equipmentID = '';
    #startDate = '';
    #endDate = '';
    #employeeID = '';
    #taskIsCreated = false;
    #taskIsEditing = false;
    constructor({taskID, equipmentName, equipmentID, startDate, endDate, employeeID, onEditTask, onDeleteTask, onMoveTask, placeNewTask})
    {
        this.#taskID = taskID;
        this.#equipmentName = equipmentName;
        this.#equipmentID = equipmentID;
        this.#startDate = startDate;
        this.#endDate = endDate;
        this.#employeeID = employeeID;
        this.onEditTask = onEditTask;
        this.onDeleteTask = onDeleteTask;
        this.onMoveTask = onMoveTask;
        this.placeNewTask = placeNewTask;
    }

    get taskID() {return this.#taskID;}

    get equipmentName() {return this.#equipmentName;}

    get equipmentID() {return this.#equipmentID;}

    get startDate() {return this.#startDate;}

    get endDate() {return this.#endDate;}

    get taskIsCreated() {return this.#taskIsCreated;}

    get taskIsEditing() {return this.#taskIsEditing;}

    set equipmentName(newEquipmentName)
    {
       if (typeof newEquipmentName !== 'string') return;
        this.#equipmentName = newEquipmentName;
    }

    set startDate(newstartDate)
    {
       if (typeof newstartDate !== 'string') return;
        this.#startDate = newstartDate;
    }

    set endDate(newendDate)
    {
       if (typeof newendDate !== 'string') return;
        this.#endDate = newendDate;
    }

    get employeeID() {return this.#employeeID;}

    set employeeID(newEmployeeID)
    {
        if (typeof newEmployeeID !== 'string') return;
        this.#employeeID = newEmployeeID;
    }

    set taskIsCreated(newCreatingState)
    {
        if (typeof newCreatingState !== typeof true) return;
        this.#taskIsCreated = newCreatingState;
    }

    set taskIsEditing(newEditingState)
    {
        if (typeof newEditingState !== typeof true) return;
        this.#taskIsEditing = newEditingState;
    }
    onAddTask = async () => {
        const selectEl = document.querySelector(`li[id="${this.#taskID}"] .options__input__select`);
        const inputStartDateEl = document.querySelector(`li[id="${this.#taskID}"] .options__input__date_start`);
        const inputEndDateEl = document.querySelector(`li[id="${this.#taskID}"] .options__input__date_end`);
        const equipmentName = selectEl.value;
        const startDate = inputStartDateEl.value;
        const endDate = inputEndDateEl.value;


        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }

        const d1 = new Date(startDate);
        const d2 = new Date(endDate);

        if (!equipmentName)
            selectEl.classList.add("error");
        else
             selectEl.classList.remove("error");
        if (!startDate || d1 >= d2)
            inputStartDateEl.classList.add("error");
        else
             inputStartDateEl.classList.remove("error");
        if (!endDate || d1 >= d2)
            inputEndDateEl.classList.add("error");
        else
            inputEndDateEl.classList.remove("error");


        if (!equipmentName || !startDate || !endDate || d1 >= d2) return;

        let mth = 'POST';
        let url = '/api/v1/tasks'

        if (this.#taskIsCreated)
        {
            mth = 'PATCH';
            url = `/api/v1/tasks/${this.#taskID}`;
        }
        const response = await fetch(url, {
                method: mth,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employeeID: this.#employeeID,
                    equipmentID: selectEl.value,
                    startDate: startDate,
                    endDate: endDate
                })
            });
        const data = await response.json();
        if (data.statusCode !== 200)
        {

            alert(`Невозможно добавить заявку: оборудование "${equipmentList.find(item => item.id === selectEl.value).name}" уже забронировано на эту дату или данный сотрудник занят в это время`);
            data.id.forEach((ids) => document.querySelector(`li[id="${ids.id}"`).classList.add("alert"));
            return;
        }
        if (!this.#taskIsCreated)
        {
            document.querySelector(`li[id="${this.#taskID}"`).setAttribute("id", data.taskID);
            this.#taskID = data.taskID;
        }

        const task = document.getElementById(this.#taskID);

        this.#startDate = startDate;
        this.#endDate = endDate;
        this.#equipmentID = selectEl.value;

        this.fix();

        if (this.#taskIsCreated)
            this.#taskIsEditing = !this.#taskIsEditing;
        this.#taskIsCreated = true;
    };

    fix = () =>
    {

        let taskEl = document.querySelector(`li[class="task alert"`);
        while (taskEl)
        {
            taskEl.classList.remove("alert");
            taskEl = document.querySelector(`li[class="task alert"`);
        }
        let optsEl = document.querySelector(`li[id="${this.#taskID}"] > ul.task__options`);
        if (optsEl)
            optsEl.remove();
        optsEl = document.querySelector(`li[id="${this.#taskID}"] > div.task__controls2`);
        if (optsEl)
            optsEl.remove();
        this.#equipmentName = equipmentList.find(item => item.id === this.#equipmentID).name;
        const taskDatasEL = document.createElement('ul');
        taskDatasEL.classList.add('task__datas');

        dataTypes.forEach(type => {
            const taskDatasDataEl = document.createElement('li');
            taskDatasDataEl.classList.add('task__datas__data');

            const spanEl1 = document.createElement('span');
            spanEl1.classList.add('task__name');

            const spanEl2 = document.createElement('span');
            spanEl2.classList.add('task__name2');
            switch (type)
            {
                case TaskDataTypes.EQUIPMENT_NAME:
                    spanEl1.innerHTML = this.#equipmentName;
                    spanEl1.setAttribute("id", this.#equipmentID);
                    spanEl2.innerHTML = "Оборудование";
                    break;
                case TaskDataTypes.START_DATE:
                    spanEl1.innerHTML = this.#startDate.split('-').reverse().join('.');
                    spanEl2.innerHTML = "Начало бронирования";
                    break;
                case TaskDataTypes.END_DATE:
                    spanEl1.innerHTML = this.#endDate.split('-').reverse().join('.');
                    spanEl2.innerHTML = "Окончание бронирования";
                    break;
                default: break;
            }
            taskDatasDataEl.appendChild(spanEl1);
            taskDatasDataEl.appendChild(spanEl2);
            taskDatasEL.appendChild(taskDatasDataEl);
        });
        const controlsEl = document.createElement('div');
        controlsEl.classList.add('task__controls');
        TaskBtnParams.forEach(({className, imageSrc, imageAlt, type}) => {
            if (type === TaskBtnTypes.ADD_TASK || type === TaskBtnTypes.EDIT_STAFF || type === TaskBtnTypes.DELETE_STAFF) return;
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);
            switch(type)
            {
                case TaskBtnTypes.EDIT_TASK:
                    buttonEl.addEventListener('click', () => this.onEditTask({
                        employeeID: this.#employeeID,
                        taskID: this.#taskID
                    }));
                    break;
                case TaskBtnTypes.DELETE_TASK:
                    buttonEl.addEventListener('click', () => this.onDeleteTask({
                        employeeID: this.#employeeID,
                        taskID: this.#taskID
                    }));
                    break;
                case TaskBtnTypes.MOVE_TASK_FORWARD:
                     buttonEl.addEventListener('click', () => this.onMoveTask({
                        employeeID: this.#employeeID,
                        taskID: this.#taskID,
                        direction: TaskBtnTypes.MOVE_TASK_FORWARD
                    }));
                    break;
                case TaskBtnTypes.MOVE_TASK_BACK:
                    buttonEl.addEventListener('click', () => this.onMoveTask({
                        employeeID: this.#employeeID,
                        taskID: this.#taskID,
                        direction: TaskBtnTypes.MOVE_TASK_BACK
                    }));
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });
        document.querySelector(`li[id="${this.#taskID}"]`).appendChild(taskDatasEL);
        document.querySelector(`li[id="${this.#taskID}"]`).appendChild(controlsEl);

        this.placeNewTask({taskID: this.#taskID, employeeID: this.#employeeID});
    }

    unFix = (taskEl) =>
    {
        const taskOptsEL = document.createElement('ul');
        taskOptsEL.classList.add('task__options');

        const OptEl = document.createElement('li');
        OptEl.classList.add('task__options__option');

        const selectEl = document.createElement('select');
        selectEl.classList.add('options__input__select');

        const optionEl = document.createElement('option');
        optionEl.setAttribute("value", "");
        optionEl.innerHTML = "Оборудование";
        selectEl.appendChild(optionEl);
        equipmentList.forEach(value => {
            const optionEl = document.createElement('option');
            optionEl.innerHTML = value.name;
            optionEl.setAttribute("value", value.id);
            if (this.#equipmentName === optionEl.innerHTML)
                optionEl.selected = true;
            selectEl.appendChild(optionEl);
        });
        OptEl.appendChild(selectEl);
        taskOptsEL.appendChild(OptEl);


        dataTypes.forEach(type => {
            if (type === TaskDataTypes.EQUIPMENT_NAME) return;
            const optEl = document.createElement('li');
            optEl.classList.add('task__options__option');

            const dateEl = document.createElement('input');
            dateEl.setAttribute("type", "date");

            let currentDate = new Date();
            currentDate.setHours(currentDate.getHours() + 3);
            currentDate =  currentDate.toISOString().split('T')[0];
            dateEl.setAttribute("min", currentDate);
            let prevDate = '';
            const spanEl = document.createElement('span');
            spanEl.classList.add('task__name2');
            switch (type)
            {
                case TaskDataTypes.START_DATE:
                    prevDate = this.#startDate;
                    dateEl.classList.add('options__input__date_start');
                    spanEl.innerHTML = "Начало бронирования";
                    break;
                case TaskDataTypes.END_DATE:
                    prevDate = this.#endDate;
                    dateEl.classList.add('options__input__date_end');
                    spanEl.innerHTML = "Окончание бронирования";
                    break;
                default: break;
            }
            if (!prevDate)
                prevDate = currentDate;
            prevDate = prevDate.split('T')[0];
            dateEl.setAttribute("value", prevDate);
            optEl.appendChild(dateEl);
            optEl.appendChild(spanEl);

            taskOptsEL.appendChild(optEl);
        });
        taskEl.appendChild(taskOptsEL);

        const controlsEl = document.createElement('div');
        controlsEl.classList.add('task__controls2');

        TaskBtnParams.slice(3, 5).forEach(({className, imageSrc, imageAlt, type}) => {
            const buttonEl = document.createElement('button');
            buttonEl.classList.add(className);
            switch(type)
            {
                case TaskBtnTypes.DELETE_TASK:
                    if (this.#taskIsEditing)
                        buttonEl.addEventListener('click', () => this.fix());
                    else
                        buttonEl.addEventListener('click', () => this.onDeleteTask({
                            employeeID: this.#employeeID,
                            taskID: this.#taskID
                        }));
                    break;
                case TaskBtnTypes.ADD_TASK:
                     buttonEl.addEventListener('click', () => this.onAddTask({
                        employeeID: this.#employeeID
                    }));
                    break;
                default: break;
            }

            const imgEl = document.createElement('img');
            imgEl.setAttribute('src', imageSrc);
            imgEl.setAttribute('alt', imageAlt);

            buttonEl.appendChild(imgEl);

            controlsEl.appendChild(buttonEl);
        });
        taskEl.appendChild(controlsEl);
    }

    render()
    {
        const taskEl = document.createElement('li');
        taskEl.classList.add('task');
        taskEl.setAttribute('id', this.#taskID);
        if (!this.taskIsCreated)
        {
            this.unFix(taskEl);
            document.querySelector(`li[id="${this.#employeeID}"] > ul.employee__tasks-list`)
            .appendChild(taskEl);
        }
        else
        {

            document.querySelector(`li[id="${this.#employeeID}"] > ul.employee__tasks-list`)
            .appendChild(taskEl);
            this.fix();
        }
    }
}