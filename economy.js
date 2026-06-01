// ==========================================
// ECONOMY.JS — Экономическая система
// Доходы, расходы, тарифы, финансы, кредиты
// ==========================================

const Economy = {
    // Тарифы игрока
    tariffs: [],

    // Кредиты
    loans: [],

    // Финансовая история (помесячно)
    monthlyReport: {
        income: 0,
        expense: 0,
        profit: 0,
        breakdown: {
            subscriptions: 0,
            hosting: 0,
            contracts: 0,
            maintenance: 0,
            salaries: 0,
            electricity: 0,
            loanPayments: 0,
            marketing: 0,
        }
    },

    // Персонал
    staff: [],

    // Маркетинг
    marketing: {
        budget: 0,
        activeAds: [],
        reach: 0, // сколько потенциальных клиентов видят рекламу
    },

    // Настройки тарифов по умолчанию
    defaultTariffs: [
        {
            name: 'Базовый',
            speed: 5,
            dataLimit: 10, // ГБ, 0 = безлимит
            price: 300,
            era: 1,
        },
        {
            name: 'Домашний',
            speed: 10,
            dataLimit: 0,
            price: 500,
            era: 1,
        },
        {
            name: 'Про',
            speed: 50,
            dataLimit: 0,
            price: 900,
            era: 2,
        },
    ],

    // Типы персонала
    STAFF_TYPES: {
        technician: {
            name: 'Монтажник',
            baseSalary: 3000,
            skills: ['installation', 'repair'],
            description: 'Прокладывает кабели, подключает клиентов',
        },
        engineer: {
            name: 'Сетевой инженер',
            baseSalary: 6000,
            skills: ['network', 'optimization'],
            description: 'Настраивает оборудование, оптимизирует сеть',
        },
        support: {
            name: 'Техподдержка',
            baseSalary: 2500,
            skills: ['support', 'retention'],
            description: 'Отвечает клиентам, решает проблемы',
        },
        sales: {
            name: 'Менеджер продаж',
            baseSalary: 3500,
            skills: ['sales', 'marketing'],
            description: 'Привлекает новых клиентов',
        },
        marketer: {
            name: 'Маркетолог',
            baseSalary: 4500,
            skills: ['marketing', 'analytics'],
            description: 'Рекламные кампании, аналитика',
        },
        accountant: {
            name: 'Бухгалтер',
            baseSalary: 4000,
            skills: ['finance', 'optimization'],
            description: 'Оптимизирует расходы, ведёт учёт',
        },
        lawyer: {
            name: 'Юрист',
            baseSalary: 5500,
            skills: ['legal', 'contracts'],
            description: 'Лицензии, контракты, защита от штрафов',
        },
        researcher: {
            name: 'R&D Инженер',
            baseSalary: 7000,
            skills: ['research', 'technology'],
            description: 'Ускоряет исследование новых технологий',
        },
    },

    // Виды кредитов
    LOAN_TYPES: [
        { name: 'Микрозайм', amount: 10000, interest: 0.15, months: 6 },
        { name: 'Малый кредит', amount: 50000, interest: 0.12, months: 12 },
        { name: 'Бизнес кредит', amount: 200000, interest: 0.10, months: 24 },
        { name: 'Крупный кредит', amount: 500000, interest: 0.08, months: 36 },
        { name: 'Инвестиционный', amount: 1000000, interest: 0.07, months: 48 },
    ],

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.tariffs = JSON.parse(JSON.stringify(this.defaultTariffs));
        this.loans = [];
        this.staff = [];
        this.marketing = { budget: 0, activeAds: [], reach: 0 };
        this.resetMonthlyReport();
    },

    resetMonthlyReport() {
        this.monthlyReport = {
            income: 0,
            expense: 0,
            profit: 0,
            breakdown: {
                subscriptions: 0,
                hosting: 0,
                contracts: 0,
                maintenance: 0,
                salaries: 0,
                electricity: 0,
                loanPayments: 0,
                marketing: 0,
            }
        };
    },

    // ==========================================
    // ТАРИФЫ
    // ==========================================
    createTariff(name, speed, dataLimit, price) {
        if (!name || speed <= 0 || price <= 0) {
            UI.notify('Некорректные параметры тарифа!', 'warning');
            return false;
        }

        if (this.tariffs.length >= 10) {
            UI.notify('Максимум 10 тарифов!', 'warning');
            return false;
        }

        this.tariffs.push({
            id: Date.now(),
            name,
            speed,
            dataLimit,
            price,
            active: true,
            subscribers: 0,
            createdDate: { ...Game.time },
        });

        UI.notify(`Тариф "${name}" создан!`, 'success');
        return true;
    },

    editTariff(index, changes) {
        if (index < 0 || index >= this.tariffs.length) return false;
        Object.assign(this.tariffs[index], changes);
        UI.notify('Тариф обновлён', 'info');
        return true;
    },

    deleteTariff(index) {
        if (index < 0 || index >= this.tariffs.length) return false;
        const tariff = this.tariffs[index];
        if (tariff.subscribers > 0) {
            UI.notify('Нельзя удалить тариф с активными подписчиками!', 'warning');
            return false;
        }
        this.tariffs.splice(index, 1);
        UI.notify('Тариф удалён', 'info');
        return true;
    },

    // Средняя цена тарифов
    getAveragePrice() {
        const active = this.tariffs.filter(t => t.active);
        if (active.length === 0) return 0;
        return active.reduce((sum, t) => sum + t.price, 0) / active.length;
    },

    // Самый популярный тариф
    getMostPopularTariff() {
        return this.tariffs.reduce((best, t) => 
            (t.subscribers > (best ? best.subscribers : 0)) ? t : best, null);
    },

    // ==========================================
    // ПЕРСОНАЛ
    // ==========================================
    hireStaff(type) {
        const staffType = this.STAFF_TYPES[type];
        if (!staffType) return false;

        const hireCost = staffType.baseSalary * 0.5; // единовременная оплата
        if (!Game.canAfford(hireCost)) {
            UI.notify('Недостаточно средств для найма!', 'warning');
            return false;
        }

        Game.spend(hireCost);

        const employee = {
            id: Date.now() + Math.random(),
            type,
            name: this.generateStaffName(),
            salary: staffType.baseSalary,
            experience: 0,
            morale: 80,
            efficiency: 0.7 + Math.random() * 0.3,
            hiredDate: { ...Game.time },
            skills: [...staffType.skills],
        };

        this.staff.push(employee);
        UI.notify(`${staffType.name} "${employee.name}" нанят(а)!`, 'success');
        return true;
    },

    fireStaff(index) {
        if (index < 0 || index >= this.staff.length) return false;
        const employee = this.staff[index];
        const severancePay = employee.salary; // выходное пособие
        Game.spend(severancePay);
        this.staff.splice(index, 1);
        UI.notify(`Сотрудник уволен`, 'info');
        return true;
    },

    generateStaffName() {
        const first = ['Алексей', 'Мария', 'Дмитрий', 'Елена', 'Сергей', 'Анна', 'Иван', 'Ольга', 'Николай', 'Татьяна', 'Андрей', 'Наталья', 'Павел', 'Ирина', 'Михаил'];
        const last = ['Иванов', 'Петров', 'Сидоров', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Соколов', 'Лебедев', 'Кузнецов', 'Попов', 'Смирнов'];
        return first[Math.floor(Math.random() * first.length)] + ' ' +
               last[Math.floor(Math.random() * last.length)];
    },

    // Количество сотрудников по типу
    getStaffCount(type) {
        return this.staff.filter(s => s.type === type).length;
    },

    // Общие зарплаты
    getTotalSalaries() {
        return this.staff.reduce((sum, s) => sum + s.salary, 0);
    },

    // Эффект персонала
    getStaffBonus(skill) {
        let bonus = 0;
        for (const employee of this.staff) {
            if (employee.skills.includes(skill)) {
                bonus += employee.efficiency * (1 + employee.experience * 0.01);
            }
        }
        return bonus;
    },

    // ==========================================
    // КРЕДИТЫ
    // ==========================================
    takeLoan(loanIndex) {
        const loanType = this.LOAN_TYPES[loanIndex];
        if (!loanType) return false;

        if (this.loans.length >= 3) {
            UI.notify('Максимум 3 активных кредита!', 'warning');
            return false;
        }

        // Проверка кредитного рейтинга
        if (Game.state.reputation < 30) {
            UI.notify('Банк отказал: низкая репутация!', 'danger');
            return false;
        }

        const loan = {
            id: Date.now(),
            name: loanType.name,
            amount: loanType.amount,
            remaining: loanType.amount * (1 + loanType.interest),
            monthlyPayment: (loanType.amount * (1 + loanType.interest)) / loanType.months,
            monthsLeft: loanType.months,
            interest: loanType.interest,
            takenDate: { ...Game.time },
        };

        this.loans.push(loan);
        Game.addMoney(loanType.amount);
        UI.notify(`Кредит "${loanType.name}" получен: ${Game.formatMoney(loanType.amount)}`, 'success');
        return true;
    },

    payOffLoan(index) {
        if (index < 0 || index >= this.loans.length) return false;
        const loan = this.loans[index];

        if (!Game.canAfford(loan.remaining)) {
            UI.notify('Недостаточно средств для погашения!', 'warning');
            return false;
        }

        Game.spend(loan.remaining);
        this.loans.splice(index, 1);
        UI.notify('Кредит погашен!', 'success');
        return true;
    },

    getTotalLoanPayments() {
        return this.loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
    },

    // ==========================================
    // МАРКЕТИНГ
    // ==========================================
    setMarketingBudget(amount) {
        if (amount < 0) return;
        this.marketing.budget = amount;
    },

    // Эффективность маркетинга (влияет на привлечение клиентов)
    getMarketingEffectiveness() {
        const budget = this.marketing.budget;
        const marketerBonus = this.getStaffBonus('marketing');

        // Diminishing returns
        const baseEffect = Math.sqrt(budget / 100) * 0.1;
        const staffMultiplier = 1 + marketerBonus * 0.3;

        return baseEffect * staffMultiplier;
    },

    // ==========================================
    // ЕЖЕМЕСЯЧНЫЕ РАСЧЁТЫ
    // ==========================================
    monthlyUpdate() {
        this.resetMonthlyReport();
        const settings = Game.getDiffSettings();

        // === ДОХОДЫ ===
        // Абонентская плата
        let subscriptionIncome = 0;
        for (const tariff of this.tariffs) {
            subscriptionIncome += tariff.price * tariff.subscribers;
        }
        subscriptionIncome *= settings.incomeMultiplier;
        this.monthlyReport.breakdown.subscriptions = subscriptionIncome;

        // Хостинг (дата-центры)
        let hostingIncome = 0;
        for (const dc of Infrastructure.datacenters) {
            if (dc.active) {
                hostingIncome += dc.servers * 200; // 200₽ за сервер
            }
        }
        this.monthlyReport.breakdown.hosting = hostingIncome;

        // Гос. контракты
        const contractIncome = this.getStaffBonus('contracts') * 2000;
        this.monthlyReport.breakdown.contracts = contractIncome;

        this.monthlyReport.income = subscriptionIncome + hostingIncome + contractIncome;

        // === РАСХОДЫ ===
        // Обслуживание инфраструктуры
        const maintenance = Infrastructure.getMaintenanceCost() * settings.expenseMultiplier;
        this.monthlyReport.breakdown.maintenance = maintenance;

        // Зарплаты
        const salaries = this.getTotalSalaries();
        this.monthlyReport.breakdown.salaries = salaries;

        // Электричество
        let electricity = 0;
        Infrastructure.nodes.forEach(n => { if (n.active) electricity += 200 * n.level; });
        Infrastructure.towers.forEach(t => { if (t.active) electricity += 150; });
        Infrastructure.datacenters.forEach(d => { if (d.active) electricity += d.servers * 50; });
        this.monthlyReport.breakdown.electricity = electricity;

        // Выплаты по кредитам
        let loanPayments = 0;
        for (let i = this.loans.length - 1; i >= 0; i--) {
            const loan = this.loans[i];
            loanPayments += loan.monthlyPayment;
            loan.remaining -= loan.monthlyPayment;
            loan.monthsLeft--;
            if (loan.monthsLeft <= 0 || loan.remaining <= 0) {
                this.loans.splice(i, 1);
                UI.notify('Кредит полностью выплачен!', 'success');
            }
        }
        this.monthlyReport.breakdown.loanPayments = loanPayments;

        // Маркетинг
        this.monthlyReport.breakdown.marketing = this.marketing.budget;

        this.monthlyReport.expense = maintenance + salaries + electricity + loanPayments + this.marketing.budget;

        // === ИТОГО ===
        this.monthlyReport.profit = this.monthlyReport.income - this.monthlyReport.expense;

        // Применяем к балансу
        Game.addMoney(this.monthlyReport.profit);

        // Обновляем глобальные показатели
        Game.state.totalIncome = this.monthlyReport.income;
        Game.state.totalExpense = this.monthlyReport.expense;

        // Обновляем опыт персонала
        for (const employee of this.staff) {
            employee.experience += 1;
            employee.efficiency = Math.min(1.5, employee.efficiency + 0.005);

            // Мораль падает если зарплата низкая
            if (employee.salary < this.STAFF_TYPES[employee.type].baseSalary) {
                employee.morale = Math.max(10, employee.morale - 5);
            } else {
                employee.morale = Math.min(100, employee.morale + 1);
            }
        }

        // Проверка банкротства
        if (Game.state.money < -50000) {
            UI.notify('⚠️ КРИТИЧЕСКИЙ ДОЛГ! Компания на грани банкротства!', 'danger');
            Game.state.reputation = Math.max(0, Game.state.reputation - 10);
        } else if (Game.state.money < 0) {
            UI.notify('Баланс отрицательный! Нужны срочные меры.', 'warning');
            Game.state.reputation = Math.max(0, Game.state.reputation - 3);
        }

        // Бухгалтер снижает расходы
        if (this.getStaffCount('accountant') > 0) {
            const savings = this.monthlyReport.expense * 0.05 * this.getStaffBonus('finance');
            Game.addMoney(savings);
        }
    },

    // ==========================================
    // ОБНОВЛЕНИЯ (каждый тик)
    // ==========================================
    update() {
        // Пока ничего - основная логика в monthlyUpdate
    },

    // ==========================================
    // ИНФОРМАЦИЯ
    // ==========================================
    getFinanceSummary() {
        return {
            balance: Game.state.money,
            monthlyIncome: this.monthlyReport.income,
            monthlyExpense: this.monthlyReport.expense,
            monthlyProfit: this.monthlyReport.profit,
            totalLoans: this.loans.reduce((sum, l) => sum + l.remaining, 0),
            staffCount: this.staff.length,
            tariffCount: this.tariffs.filter(t => t.active).length,
        };
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            tariffs: this.tariffs,
            loans: this.loans,
            staff: this.staff,
            marketing: this.marketing,
            monthlyReport: this.monthlyReport,
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.tariffs) this.tariffs = data.tariffs;
        if (data.loans) this.loans = data.loans;
        if (data.staff) this.staff = data.staff;
        if (data.marketing) this.marketing = data.marketing;
        if (data.monthlyReport) this.monthlyReport = data.monthlyReport;
    },
};
