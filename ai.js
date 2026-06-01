// ==========================================
// AI.JS — Искусственный интеллект
// Конкуренты, город, рынок, персонал, советник
// ==========================================

const AI = {
    // Конкуренты
    competitors: [],

    // Рынок
    market: {
        totalDemand: 100,
        growthRate: 0.02,
        priceIndex: 1.0,       // индекс цен рынка (1.0 = норма)
        trendingTech: null,    // какая технология сейчас в тренде
        season: 'normal',      // normal, boom, recession
    },

    // Городской ИИ
    city: {
        population: 5000,
        growthRate: 0.005,
        newBuildingsQueue: [],
        events: [],
    },

    // Советник
    advisor: {
        messages: [],
        lastAdvice: 0,
        personality: 'balanced', // balanced, aggressive, conservative
    },

    // Шаблоны конкурентов
    COMPETITOR_TEMPLATES: [
        {
            name: 'МегаТелеком',
            style: 'giant',
            color: '#e74c3c',
            icon: '🏢',
            startClients: 200,
            startMoney: 500000,
            aggression: 0.3,
            techLevel: 2,
            description: 'Крупный оператор. Медленный но мощный.',
            behavior: {
                priceStrategy: 'premium',    // premium, budget, match
                expansionRate: 0.3,
                marketingBudget: 0.1,
                techInvestment: 0.05,
            }
        },
        {
            name: 'SpeedNet',
            style: 'aggressive',
            color: '#f39c12',
            icon: '⚡',
            startClients: 50,
            startMoney: 100000,
            aggression: 0.8,
            techLevel: 1,
            description: 'Агрессивный демпинг, быстрый рост.',
            behavior: {
                priceStrategy: 'budget',
                expansionRate: 0.7,
                marketingBudget: 0.2,
                techInvestment: 0.03,
            }
        },
        {
            name: 'FiberOne',
            style: 'premium',
            color: '#2ecc71',
            icon: '💎',
            startClients: 80,
            startMoney: 200000,
            aggression: 0.4,
            techLevel: 3,
            description: 'Премиум, только оптика. Высокое качество.',
            behavior: {
                priceStrategy: 'premium',
                expansionRate: 0.2,
                marketingBudget: 0.05,
                techInvestment: 0.15,
            }
        },
        {
            name: 'SkyLink',
            style: 'wireless',
            color: '#3498db',
            icon: '📡',
            startClients: 30,
            startMoney: 150000,
            aggression: 0.5,
            techLevel: 2,
            description: 'Спутниковый и беспроводной. Покрывает удалённые зоны.',
            behavior: {
                priceStrategy: 'match',
                expansionRate: 0.5,
                marketingBudget: 0.1,
                techInvestment: 0.1,
            }
        },
        {
            name: 'ГородWiFi',
            style: 'municipal',
            color: '#9b59b6',
            icon: '🏛️',
            startClients: 100,
            startMoney: 300000,
            aggression: 0.2,
            techLevel: 1,
            description: 'Муниципальный провайдер. Гос. поддержка.',
            behavior: {
                priceStrategy: 'budget',
                expansionRate: 0.1,
                marketingBudget: 0.02,
                techInvestment: 0.02,
            }
        },
    ],

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.competitors = [];
        this.market = {
            totalDemand: 100,
            growthRate: 0.02,
            priceIndex: 1.0,
            trendingTech: null,
            season: 'normal',
        };
        this.city = {
            population: 5000,
            growthRate: 0.005,
            newBuildingsQueue: [],
            events: [],
        };
        this.advisor = {
            messages: [],
            lastAdvice: 0,
            personality: 'balanced',
        };

        // Создаём начальных конкурентов (2-3 в зависимости от сложности)
        const diffSettings = Game.getDiffSettings();
        const numCompetitors = Game.difficulty === 'easy' ? 2 : Game.difficulty === 'hard' ? 4 : 3;

        const shuffled = [...this.COMPETITOR_TEMPLATES].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(numCompetitors, shuffled.length); i++) {
            this.createCompetitor(shuffled[i]);
        }
    },

    createCompetitor(template) {
        const competitor = {
            id: this.competitors.length,
            name: template.name,
            style: template.style,
            color: template.color,
            icon: template.icon,
            description: template.description,

            // Состояние
            clients: template.startClients,
            money: template.startMoney,
            avgPrice: 400 + Math.random() * 300,
            avgSpeed: 10 + Math.random() * 40,
            coverage: 10 + Math.random() * 20,
            reputation: 50 + Math.random() * 30,
            marketShare: 0,
            alive: true,
            techLevel: template.techLevel,

            // Поведение
            aggression: template.aggression,
            behavior: { ...template.behavior },

            // История
            monthlyGrowth: 0,
            lastAction: null,
            relationToPlayer: 0, // -100 (враждебный) до 100 (дружелюбный)
        };

        this.competitors.push(competitor);
    },

    // ==========================================
    // ОБНОВЛЕНИЕ (каждый тик)
    // ==========================================
    update() {
        // Обновляем конкурентов каждый тик (но редко)
        if (Math.random() < 0.01) {
            this.updateCompetitors();
        }

        // Городской ИИ
        if (Math.random() < 0.005) {
            this.updateCity();
        }
    },

    // ==========================================
    // ЕЖЕМЕСЯЧНЫЕ ОБНОВЛЕНИЯ
    // ==========================================
    monthlyUpdate() {
        this.updateMarket();
        this.competitorMonthlyActions();
        this.cityMonthlyGrowth();
        this.generateAdvice();
        this.calculateMarketShares();
    },

    // ==========================================
    // КОНКУРЕНТЫ
    // ==========================================
    updateCompetitors() {
        const diffSettings = Game.getDiffSettings();

        for (const comp of this.competitors) {
            if (!comp.alive) continue;

            // Органический рост/падение
            const growthFactor = comp.behavior.expansionRate * (1 + this.market.growthRate);
            const clientChange = Math.floor((Math.random() - 0.3) * growthFactor * 5);
            comp.clients = Math.max(0, comp.clients + clientChange);

            // Деньги
            const income = comp.clients * comp.avgPrice;
            const expense = comp.clients * comp.avgPrice * 0.6; // 60% расходы
            comp.money += (income - expense) * 0.01; // за тик

            // Банкротство конкурента
            if (comp.money < -100000) {
                comp.alive = false;
                UI.notify(`${comp.icon} ${comp.name} обанкротился!`, 'info');
                // Часть клиентов переходит на рынок
                this.market.totalDemand += comp.clients * 0.5;
            }
        }
    },

    competitorMonthlyActions() {
        const diffSettings = Game.getDiffSettings();

        for (const comp of this.competitors) {
            if (!comp.alive) continue;

            // Реагируем на игрока
            this.competitorReaction(comp);

            // Рост покрытия
            comp.coverage = Math.min(90, comp.coverage + comp.behavior.expansionRate * 2);

            // Рост технологий
            comp.techLevel += comp.behavior.techInvestment * 0.1;

            // Обновляем среднюю скорость
            comp.avgSpeed = 10 * Math.pow(2, comp.techLevel);

            // Маркетинг
            const marketingEffect = comp.behavior.marketingBudget * comp.money * 0.0001;
            comp.clients += Math.floor(marketingEffect * Math.random());

            // Агрессия зависит от сложности
            comp.aggression = this.COMPETITOR_TEMPLATES.find(t => t.name === comp.name)?.aggression || 0.5;
            comp.aggression *= diffSettings.competitorAggression;
        }
    },

    competitorReaction(comp) {
        const playerPrice = Economy.getAveragePrice();
        const playerClients = Game.state.totalClients;

        // Реакция на цены игрока
        if (comp.behavior.priceStrategy === 'budget') {
            // Всегда дешевле
            comp.avgPrice = Math.max(200, playerPrice * 0.75);
        } else if (comp.behavior.priceStrategy === 'premium') {
            // Выше но с лучшим сервисом
            comp.avgPrice = playerPrice * 1.2;
            comp.reputation = Math.min(90, comp.reputation + 0.5);
        } else {
            // Пытается совпасть
            comp.avgPrice = playerPrice * (0.9 + Math.random() * 0.2);
        }

        // Если игрок забирает долю — конкурент становится агрессивнее
        if (playerClients > comp.clients * 1.5) {
            comp.aggression = Math.min(1, comp.aggression + 0.05);
            comp.relationToPlayer -= 2;

            // Демпинг
            if (comp.aggression > 0.7 && Math.random() < 0.3) {
                comp.avgPrice *= 0.85;
                comp.lastAction = 'Снизил цены!';
                UI.notify(`${comp.icon} ${comp.name} снизил цены для переманивания клиентов!`, 'warning');
            }
        } else {
            comp.relationToPlayer = Math.min(50, comp.relationToPlayer + 1);
        }

        // Предложение о слиянии (если конкурент слабый)
        if (comp.clients < 20 && comp.money < 10000 && Math.random() < 0.05) {
            comp.lastAction = 'Предлагает продать бизнес';
            // TODO: UI для покупки конкурента
        }
    },

    calculateMarketShares() {
        let totalClients = Game.state.totalClients;
        for (const comp of this.competitors) {
            if (comp.alive) totalClients += comp.clients;
        }

        if (totalClients === 0) return;

        Game.state.marketShare = Math.round((Game.state.totalClients / totalClients) * 100);

        for (const comp of this.competitors) {
            comp.marketShare = comp.alive ?
                Math.round((comp.clients / totalClients) * 100) : 0;
        }
    },

    // ==========================================
    // ГОРОДСКОЙ ИИ
    // ==========================================
    updateCity() {
        // Случайные события города
        if (Math.random() < 0.01) {
            const events = [
                { type: 'new_district', message: 'Новый жилой район строится!' },
                { type: 'business_park', message: 'Открывается бизнес-парк!' },
                { type: 'renovation', message: 'Реновация старого квартала' },
            ];
            const event = events[Math.floor(Math.random() * events.length)];
            this.city.events.push(event);
        }
    },

    cityMonthlyGrowth() {
        // Рост населения
        this.city.population = Math.floor(this.city.population * (1 + this.city.growthRate));

        // Новые здания появляются
        if (Math.random() < 0.3) {
            this.spawnNewBuilding();
        }

        // Рост спроса на интернет
        this.market.totalDemand *= (1 + this.market.growthRate);
    },

    spawnNewBuilding() {
        // Находим свободное место рядом с дорогой в разблокированной зоне
        const zones = MapSystem.zones.filter(z => z.unlocked);
        if (zones.length === 0) return;

        const zone = zones[Math.floor(Math.random() * zones.length)];

        for (let attempts = 0; attempts < 20; attempts++) {
            const x = zone.x + Math.floor(Math.random() * zone.w);
            const y = zone.y + Math.floor(Math.random() * zone.h);
            const tile = MapSystem.getTile(x, y);

            if (tile && tile.type === MapSystem.TILE_TYPES.GRASS && MapSystem.isAdjacentToRoad(x, y)) {
                const types = ['residential', 'residential', 'residential', 'commercial', 'industrial'];
                const type = types[Math.floor(Math.random() * types.length)];
                const building = MapSystem.createBuilding(x, y, type);

                const T = MapSystem.TILE_TYPES;
                const typeMap = { residential: T.BUILDING_RESIDENTIAL, commercial: T.BUILDING_COMMERCIAL, industrial: T.BUILDING_INDUSTRIAL };
                tile.type = typeMap[type] || T.BUILDING_RESIDENTIAL;
                tile.building = building;
                MapSystem.buildings.push(building);

                // Обновляем подключения (новое здание может попасть в зону покрытия)
                Infrastructure.updateConnections();
                return;
            }
        }
    },

    // ==========================================
    // РЫНОК
    // ==========================================
    updateMarket() {
        // Сезонные циклы
        const month = Game.time.month;
        if (month >= 9 && month <= 11) {
            this.market.season = 'boom'; // осень — все подключаются
            this.market.growthRate = 0.04;
        } else if (month >= 6 && month <= 8) {
            this.market.season = 'slow'; // лето — меньше подключений
            this.market.growthRate = 0.01;
        } else {
            this.market.season = 'normal';
            this.market.growthRate = 0.02;
        }

        // Технологические тренды
        const year = Game.time.year;
        if (year >= 2020) {
            this.market.trendingTech = '5G';
        } else if (year >= 2015) {
            this.market.trendingTech = '4G/Облака';
        } else if (year >= 2010) {
            this.market.trendingTech = 'Мобильный интернет';
        } else if (year >= 2007) {
            this.market.trendingTech = 'Оптоволокно';
        } else {
            this.market.trendingTech = 'Широкополосный';
        }

        // Индекс цен (инфляция)
        this.market.priceIndex *= (1 + 0.003); // ~3.6% в год
    },

    // ==========================================
    // СОВЕТНИК
    // ==========================================
    generateAdvice() {
        const advice = [];

        // Финансы
        if (Game.state.money < 5000) {
            advice.push('💰 Деньги на исходе! Рассмотрите кредит или сократите расходы.');
        }

        // Покрытие
        if ((Game.state.coverage || 0) < 20 && Game.state.totalClients < 10) {
            advice.push('🔌 Проложите кабель к ближайшим домам для привлечения первых клиентов.');
        }

        // Конкуренты
        const aggressiveComp = this.competitors.find(c => c.alive && c.aggression > 0.7);
        if (aggressiveComp) {
            advice.push(`⚠️ ${aggressiveComp.name} ведёт агрессивную политику. Укрепите позиции!`);
        }

        // Клиенты
        if (Clients.getChurnRate() > 10) {
            advice.push('😟 Высокий отток клиентов! Проверьте качество связи и цены.');
        }

        // Персонал
        if (Economy.staff.length === 0 && Game.state.totalClients > 20) {
            advice.push('👷 Пора нанять персонал — монтажников и техподдержку.');
        }

        // Очередь подключений
        if (Clients.getQueueLength() > 10) {
            advice.push('📋 Большая очередь заявок! Наймите больше монтажников.');
        }

        // Инфраструктура
        const brokenCables = Infrastructure.cables.filter(c => c.health < 30);
        if (brokenCables.length > 0) {
            advice.push(`🔧 ${brokenCables.length} кабелей в плохом состоянии. Нужен ремонт!`);
        }

        // Новые зоны
        if (Game.state.totalClients > 50 && MapSystem.zones.filter(z => z.unlocked).length < 3) {
            advice.push('🗺️ Можно расширить территорию — откройте новую зону!');
        }

        // Показываем одну подсказку
        if (advice.length > 0 && Game.time.totalDays - this.advisor.lastAdvice > 5) {
            const msg = advice[Math.floor(Math.random() * advice.length)];
            UI.showAdvisor(msg);
            this.advisor.lastAdvice = Game.time.totalDays;
            this.advisor.messages.push({ text: msg, day: Game.time.totalDays });
        }
    },

    // Получить сравнение с конкурентами
    getCompetitorComparison() {
        return this.competitors.filter(c => c.alive).map(c => ({
            name: c.name,
            icon: c.icon,
            color: c.color,
            clients: c.clients,
            avgPrice: Math.round(c.avgPrice),
            avgSpeed: Math.round(c.avgSpeed),
            coverage: Math.round(c.coverage),
            marketShare: c.marketShare,
            reputation: Math.round(c.reputation),
            style: c.description,
            lastAction: c.lastAction,
            relation: c.relationToPlayer > 20 ? 'Дружелюбный' :
                      c.relationToPlayer < -20 ? 'Враждебный' : 'Нейтральный',
        }));
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            competitors: this.competitors,
            market: this.market,
            city: this.city,
            advisor: { lastAdvice: this.advisor.lastAdvice, personality: this.advisor.personality },
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.competitors) this.competitors = data.competitors;
        if (data.market) this.market = data.market;
        if (data.city) this.city = data.city;
        if (data.advisor) {
            this.advisor.lastAdvice = data.advisor.lastAdvice || 0;
            this.advisor.personality = data.advisor.personality || 'balanced';
        }
    },
};
