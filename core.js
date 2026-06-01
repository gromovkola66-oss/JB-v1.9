// ==========================================
// CORE.JS — Ядро игры
// Игровой цикл, управление временем, сохранение/загрузка
// ==========================================

const Game = {
    // Состояние
    running: false,
    paused: false,
    speed: 1,
    slot: 1,
    difficulty: 'normal',
    lastTimestamp: 0,
    accumulator: 0,
    tickRate: 1000 / 60, // 60 FPS
    gameTickRate: 1000, // 1 игровой тик в секунду (реальное время)
    gameTickAccumulator: 0,

    // Игровое время
    time: {
        day: 1,
        month: 1, // 1-12
        year: 2005,
        hour: 8,
        totalDays: 0,
        totalMonths: 0,
        speed: 1, // множитель скорости
        dayLength: 60, // секунд на 1 игровой день при скорости x1
        dayProgress: 0, // 0-1 прогресс текущего дня
    },

    // Данные игрока
    state: {
        companyName: 'NetLink',
        playerName: 'Игрок',
        money: 50000,
        reputation: 50,
        totalClients: 0,
        totalIncome: 0,
        totalExpense: 0,
        uptime: 100,
        era: 1, // 1-5
        unlockedAreas: 1,
    },

    // Статистика
    stats: {
        totalEarned: 0,
        totalSpent: 0,
        clientsEverConnected: 0,
        cableLayedKm: 0,
        towersBuilt: 0,
        eventsHandled: 0,
        monthlyHistory: [], // {month, year, income, expense, clients}
    },

    // Настройки сложности
    difficultySettings: {
        easy: {
            startMoney: 100000,
            incomeMultiplier: 1.5,
            expenseMultiplier: 0.7,
            clientPatience: 1.5,
            competitorAggression: 0.5,
            eventFrequency: 0.7,
        },
        normal: {
            startMoney: 50000,
            incomeMultiplier: 1.0,
            expenseMultiplier: 1.0,
            clientPatience: 1.0,
            competitorAggression: 1.0,
            eventFrequency: 1.0,
        },
        hard: {
            startMoney: 25000,
            incomeMultiplier: 0.8,
            expenseMultiplier: 1.3,
            clientPatience: 0.6,
            competitorAggression: 1.5,
            eventFrequency: 1.3,
        }
    },

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    startNew() {
        const nameInput = document.getElementById('companyName');
        const playerInput = document.getElementById('playerName');

        this.state.companyName = nameInput.value.trim() || 'NetLink';
        this.state.playerName = playerInput.value.trim() || 'Игрок';

        const settings = this.difficultySettings[this.difficulty];
        this.state.money = settings.startMoney;
        this.state.reputation = 50;
        this.state.totalClients = 0;
        this.state.totalIncome = 0;
        this.state.totalExpense = 0;
        this.state.uptime = 100;
        this.state.era = 1;
        this.state.unlockedAreas = 1;

        this.time = {
            day: 1,
            month: 1,
            year: 2005,
            hour: 8,
            totalDays: 0,
            totalMonths: 0,
            speed: 1,
            dayLength: 60,
            dayProgress: 0,
        };

        this.stats = {
            totalEarned: 0,
            totalSpent: 0,
            clientsEverConnected: 0,
            cableLayedKm: 0,
            towersBuilt: 0,
            eventsHandled: 0,
            monthlyHistory: [],
        };

        // Инициализация подсистем
        MapSystem.init();
        Infrastructure.init();
        Economy.init();
        Clients.init();
        AI.init();
        Tech.init();
        Events.init();
        Renderer.init();

        // Запуск
        this.running = true;
        this.paused = false;
        this.speed = 1;

        UI.showGameScreen();
        UI.updateAll();

        this.lastTimestamp = performance.now();
        requestAnimationFrame((ts) => this.loop(ts));

        // Приветствие советника
        setTimeout(() => {
            UI.showAdvisor('Добро пожаловать! Вы основали компанию "' + this.state.companyName + '". Начните с прокладки кабеля к ближайшим домам.');
        }, 1000);

        // Запуск туториала
        Tutorial.start();
    },

    // ==========================================
    // ИГРОВОЙ ЦИКЛ
    // ==========================================
    loop(timestamp) {
        if (!this.running) return;

        const deltaMs = Math.min(timestamp - this.lastTimestamp, 100); // cap at 100ms
        this.lastTimestamp = timestamp;

        if (!this.paused) {
            // Рендер каждый кадр
            this.accumulator += deltaMs;
            while (this.accumulator >= this.tickRate) {
                this.accumulator -= this.tickRate;
            }

            // Игровые тики (1 в секунду * скорость)
            const scaledDelta = deltaMs * this.speed;
            this.gameTickAccumulator += scaledDelta;

            while (this.gameTickAccumulator >= this.gameTickRate) {
                this.gameTickAccumulator -= this.gameTickRate;
                this.gameTick();
            }

            // Прогресс дня
            this.time.dayProgress += (scaledDelta / 1000) / this.time.dayLength;
            if (this.time.dayProgress >= 1) {
                this.time.dayProgress = 0;
                this.advanceDay();
            }

            // Обновление часа
            this.time.hour = 8 + Math.floor(this.time.dayProgress * 16); // 8:00 - 24:00
        }

        // Рендеринг (всегда, даже на паузе)
        Renderer.render();
        UI.updateTopBar();

        requestAnimationFrame((ts) => this.loop(ts));
    },

    // Игровой тик — основные обновления
    gameTick() {
        try {
            Infrastructure.update();
            Clients.update();
            Economy.update();
            AI.update();
            Events.update();
        } catch (e) {
            console.error('Game tick error:', e);
        }
    },

    // Новый день
    advanceDay() {
        this.time.day++;
        this.time.totalDays++;

        // Новый месяц
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const monthIndex = Math.max(0, Math.min(11, this.time.month - 1));
        if (this.time.day > daysInMonth[monthIndex]) {
            this.time.day = 1;
            this.advanceMonth();
        }

        // Ежедневные обновления
        Infrastructure.dailyUpdate();
        Events.dailyCheck();
    },

    // Новый месяц
    advanceMonth() {
        this.time.month++;
        this.time.totalMonths++;

        if (this.time.month > 12) {
            this.time.month = 1;
            this.time.year++;
        }

        // Ежемесячные обновления
        Economy.monthlyUpdate();
        Clients.monthlyUpdate();
        AI.monthlyUpdate();
        Tech.monthlyUpdate();
        Achievements.check();

        // Статистика
        this.stats.monthlyHistory.push({
            month: this.time.month,
            year: this.time.year,
            income: this.state.totalIncome,
            expense: this.state.totalExpense,
            clients: this.state.totalClients,
            money: this.state.money,
        });

        // Ограничим историю
        if (this.stats.monthlyHistory.length > 120) {
            this.stats.monthlyHistory.shift();
        }

        // Обновление UI
        UI.updateAll();

        // Автосохранение каждые 3 месяца
        if (this.time.totalMonths % 3 === 0) {
            this.save();
            UI.notify('Автосохранение', 'info');
        }
    },

    // ==========================================
    // УПРАВЛЕНИЕ ВРЕМЕНЕМ
    // ==========================================
    togglePause() {
        this.paused = !this.paused;
        UI.updateTimeButtons();
    },

    setSpeed(speed) {
        this.speed = speed;
        this.paused = false;
        UI.updateTimeButtons();
        Tutorial.trigger('speed_changed');
    },

    // ==========================================
    // СОХРАНЕНИЕ / ЗАГРУЗКА
    // ==========================================
    save() {
        const saveData = {
            version: '0.1.0',
            timestamp: Date.now(),
            difficulty: this.difficulty,
            state: { ...this.state },
            time: { ...this.time },
            stats: { ...this.stats },
            map: MapSystem.serialize(),
            infrastructure: Infrastructure.serialize(),
            economy: Economy.serialize(),
            clients: Clients.serialize(),
            ai: AI.serialize(),
            tech: Tech.serialize(),
            events: Events.serialize(),
            achievements: Achievements.serialize(),
        };

        const key = `ipt_save_${this.slot}`;
        try {
            localStorage.setItem(key, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            UI.notify('Ошибка сохранения!', 'danger');
            return false;
        }
    },

    load(slot) {
        const key = `ipt_save_${slot}`;
        const data = localStorage.getItem(key);
        if (!data) return false;

        try {
            const saveData = JSON.parse(data);

            this.slot = slot;
            this.difficulty = saveData.difficulty || 'normal';
            this.state = { ...this.state, ...saveData.state };
            this.time = { ...this.time, ...saveData.time };
            this.stats = { ...this.stats, ...saveData.stats };

            // Загрузка подсистем
            MapSystem.init();
            MapSystem.deserialize(saveData.map);
            Infrastructure.init();
            Infrastructure.deserialize(saveData.infrastructure);
            Economy.init();
            Economy.deserialize(saveData.economy);
            Clients.init();
            Clients.deserialize(saveData.clients);
            AI.init();
            AI.deserialize(saveData.ai);
            Tech.init();
            Tech.deserialize(saveData.tech);
            Events.init();
            Events.deserialize(saveData.events);
            Achievements.deserialize(saveData.achievements);
            Renderer.init();

            this.running = true;
            this.paused = true; // Стартуем на паузе
            this.speed = 1;

            UI.showGameScreen();
            UI.updateAll();

            this.lastTimestamp = performance.now();
            requestAnimationFrame((ts) => this.loop(ts));

            UI.notify('Игра загружена', 'success');
            return true;
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            UI.notify('Ошибка загрузки!', 'danger');
            return false;
        }
    },

    getSaveInfo(slot) {
        const key = `ipt_save_${slot}`;
        const data = localStorage.getItem(key);
        if (!data) return null;

        try {
            const saveData = JSON.parse(data);
            return {
                companyName: saveData.state.companyName,
                money: saveData.state.money,
                clients: saveData.state.totalClients,
                date: `${this.getMonthName(saveData.time.month)} ${saveData.time.year}`,
                timestamp: saveData.timestamp,
                difficulty: saveData.difficulty,
            };
        } catch (e) {
            return null;
        }
    },

    deleteSave(slot) {
        localStorage.removeItem(`ipt_save_${slot}`);
    },

    // ==========================================
    // УТИЛИТЫ
    // ==========================================
    getMonthName(month) {
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        return months[(month - 1) % 12];
    },

    getFullMonthName(month) {
        const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        return months[(month - 1) % 12];
    },

    getEraName(era) {
        const eras = ['Dial-up', 'Широкополосный', 'Мобильный', 'Облачный', 'Будущее'];
        return eras[(era - 1)] || 'Неизвестно';
    },

    formatMoney(amount) {
        if (Math.abs(amount) >= 1000000) {
            return (amount / 1000000).toFixed(1) + ' млн ₽';
        } else if (Math.abs(amount) >= 10000) {
            return (amount / 1000).toFixed(0) + ' тыс ₽';
        }
        return amount.toLocaleString('ru-RU') + ' ₽';
    },

    getDiffSettings() {
        return this.difficultySettings[this.difficulty] || this.difficultySettings.normal;
    },

    exitToMenu() {
        this.running = false;
        this.paused = false;
        UI.showMainMenu();
    },

    // Добавить деньги (может быть отрицательным)
    addMoney(amount) {
        this.state.money += amount;
        if (amount > 0) {
            this.stats.totalEarned += amount;
        } else {
            this.stats.totalSpent += Math.abs(amount);
        }
    },

    // Проверка хватает ли денег
    canAfford(cost) {
        return this.state.money >= cost;
    },

    // Потратить деньги (вернёт false если не хватает)
    spend(amount) {
        if (this.state.money < amount) return false;
        this.state.money -= amount;
        this.stats.totalSpent += amount;
        return true;
    },
};
