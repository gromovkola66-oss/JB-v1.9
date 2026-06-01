// ==========================================
// TECH.JS — Дерево технологий
// 5 эпох, исследования, разблокировки
// ==========================================

const Tech = {
    // Текущие исследования
    currentResearch: null,
    researchProgress: 0,
    researchedTechs: [],

    // Очки исследований
    researchPoints: 0,
    researchPerMonth: 1,

    // Эпохи
    ERAS: [
        { id: 1, name: 'Dial-up', yearStart: 2005, color: '#8b7355' },
        { id: 2, name: 'Широкополосный', yearStart: 2007, color: '#3498db' },
        { id: 3, name: 'Мобильный', yearStart: 2012, color: '#2ecc71' },
        { id: 4, name: 'Облачный', yearStart: 2016, color: '#9b59b6' },
        { id: 5, name: 'Будущее', yearStart: 2020, color: '#e74c3c' },
    ],

    // Дерево технологий
    TECHNOLOGIES: [
        // === ЭПОХА 1: Dial-up ===
        {
            id: 'modem_pool',
            name: 'Модемный пул',
            description: 'Базовое dial-up подключение для первых клиентов',
            era: 1,
            cost: 0, // стартовая
            researchTime: 0,
            prerequisites: [],
            unlocks: ['Медный кабель', 'Серверная стойка'],
            effect: { type: 'unlock_cable', value: 'copper' },
            researched: true, // уже есть
        },
        {
            id: 'dsl_equipment',
            name: 'DSL оборудование',
            description: 'ADSL — до 8 Мбит/с по телефонным линиям',
            era: 1,
            cost: 3000,
            researchTime: 5,
            prerequisites: ['modem_pool'],
            unlocks: ['Скорость +50% для медных линий'],
            effect: { type: 'speed_boost', target: 'copper', value: 1.5 },
        },
        {
            id: 'adsl2plus',
            name: 'ADSL2+',
            description: 'Улучшенный DSL — до 24 Мбит/с',
            era: 1,
            cost: 5000,
            researchTime: 8,
            prerequisites: ['dsl_equipment'],
            unlocks: ['Скорость +100% для медных линий'],
            effect: { type: 'speed_boost', target: 'copper', value: 2.0 },
        },
        {
            id: 'coaxial_network',
            name: 'Коаксиальная сеть',
            description: 'Кабельный интернет по ТВ-кабелю',
            era: 1,
            cost: 8000,
            researchTime: 10,
            prerequisites: ['modem_pool'],
            unlocks: ['Коаксиальный кабель'],
            effect: { type: 'unlock_cable', value: 'coaxial' },
        },
        {
            id: 'caching_proxy',
            name: 'Кэширующий прокси',
            description: 'Ускоряет популярные сайты для клиентов',
            era: 1,
            cost: 4000,
            researchTime: 6,
            prerequisites: ['modem_pool'],
            unlocks: ['Удовлетворённость +5%'],
            effect: { type: 'satisfaction_boost', value: 5 },
        },

        // === ЭПОХА 2: Широкополосный ===
        {
            id: 'fiber_basics',
            name: 'Основы оптоволокна',
            description: 'Технология FTTH — оптика до дома',
            era: 2,
            cost: 15000,
            researchTime: 15,
            prerequisites: ['coaxial_network'],
            unlocks: ['Оптоволоконный кабель'],
            effect: { type: 'unlock_cable', value: 'fiber' },
        },
        {
            id: 'gpon',
            name: 'GPON',
            description: 'Гигабитная пассивная оптика — 1 волокно на 64 клиента',
            era: 2,
            cost: 20000,
            researchTime: 18,
            prerequisites: ['fiber_basics'],
            unlocks: ['Пропускная способность оптики x2'],
            effect: { type: 'capacity_boost', target: 'fiber', value: 2.0 },
        },
        {
            id: 'l3_switching',
            name: 'Коммутация L3',
            description: 'Маршрутизация на аппаратном уровне',
            era: 2,
            cost: 12000,
            researchTime: 12,
            prerequisites: ['coaxial_network'],
            unlocks: ['Ёмкость узлов +50%'],
            effect: { type: 'node_capacity', value: 1.5 },
        },
        {
            id: 'wifi_hotspots',
            name: 'Wi-Fi хотспоты',
            description: 'Беспроводные точки доступа для клиентов',
            era: 2,
            cost: 10000,
            researchTime: 10,
            prerequisites: ['dsl_equipment'],
            unlocks: ['Wi-Fi точки'],
            effect: { type: 'unlock_tower', value: 'wifi' },
        },
        {
            id: 'docsis3',
            name: 'DOCSIS 3.0',
            description: 'Скоростной коаксиал — до 1 Гбит/с',
            era: 2,
            cost: 18000,
            researchTime: 14,
            prerequisites: ['coaxial_network', 'l3_switching'],
            unlocks: ['Скорость коаксиала x3'],
            effect: { type: 'speed_boost', target: 'coaxial', value: 3.0 },
        },

        // === ЭПОХА 3: Мобильный ===
        {
            id: '3g_technology',
            name: '3G технология',
            description: 'Мобильный интернет третьего поколения',
            era: 3,
            cost: 30000,
            researchTime: 20,
            prerequisites: ['wifi_hotspots'],
            unlocks: ['3G Вышки'],
            effect: { type: 'unlock_tower', value: '3g' },
        },
        {
            id: '4g_lte',
            name: '4G LTE',
            description: 'Высокоскоростной мобильный интернет',
            era: 3,
            cost: 50000,
            researchTime: 25,
            prerequisites: ['3g_technology'],
            unlocks: ['4G LTE Вышки'],
            effect: { type: 'unlock_tower', value: '4g' },
        },
        {
            id: 'lte_advanced',
            name: 'LTE-Advanced',
            description: 'Агрегация каналов — скорость 4G x2',
            era: 3,
            cost: 40000,
            researchTime: 20,
            prerequisites: ['4g_lte'],
            unlocks: ['Скорость 4G вышек x2'],
            effect: { type: 'tower_speed', target: '4g', value: 2.0 },
        },
        {
            id: 'mesh_networks',
            name: 'Mesh-сети',
            description: 'Самоорганизующиеся беспроводные сети',
            era: 3,
            cost: 25000,
            researchTime: 15,
            prerequisites: ['wifi_hotspots', '3g_technology'],
            unlocks: ['Радиус Wi-Fi +50%'],
            effect: { type: 'tower_radius', target: 'wifi', value: 1.5 },
        },

        // === ЭПОХА 4: Облачный ===
        {
            id: 'datacenter_tech',
            name: 'Дата-центры',
            description: 'Строительство собственных дата-центров',
            era: 4,
            cost: 80000,
            researchTime: 30,
            prerequisites: ['gpon', 'l3_switching'],
            unlocks: ['Дата-центры', 'Хостинг'],
            effect: { type: 'unlock_building', value: 'datacenter' },
        },
        {
            id: 'cdn',
            name: 'CDN сеть',
            description: 'Сеть доставки контента — ускорение для клиентов',
            era: 4,
            cost: 60000,
            researchTime: 25,
            prerequisites: ['datacenter_tech'],
            unlocks: ['Удовлетворённость +10%', 'Доход хостинга x2'],
            effect: { type: 'satisfaction_boost', value: 10 },
        },
        {
            id: 'virtualization',
            name: 'Виртуализация NFV',
            description: 'Виртуальные сетевые функции — снижение расходов',
            era: 4,
            cost: 50000,
            researchTime: 22,
            prerequisites: ['datacenter_tech'],
            unlocks: ['Обслуживание -20%'],
            effect: { type: 'maintenance_reduction', value: 0.8 },
        },
        {
            id: 'xgs_pon',
            name: 'XGS-PON',
            description: '10-гигабитная пассивная оптика',
            era: 4,
            cost: 70000,
            researchTime: 28,
            prerequisites: ['gpon', 'datacenter_tech'],
            unlocks: ['XGS-PON Оптика'],
            effect: { type: 'unlock_cable', value: 'fiber_xgs' },
        },
        {
            id: 'sdn',
            name: 'SDN',
            description: 'Программно-определяемые сети — автоматизация',
            era: 4,
            cost: 45000,
            researchTime: 20,
            prerequisites: ['virtualization'],
            unlocks: ['Ёмкость узлов x2', 'Автоматический мониторинг'],
            effect: { type: 'node_capacity', value: 2.0 },
        },

        // === ЭПОХА 5: Будущее ===
        {
            id: '5g_technology',
            name: '5G mmWave',
            description: '5G на миллиметровых волнах — до 10 Гбит/с',
            era: 5,
            cost: 120000,
            researchTime: 35,
            prerequisites: ['4g_lte', 'xgs_pon'],
            unlocks: ['5G Вышки'],
            effect: { type: 'unlock_tower', value: '5g' },
        },
        {
            id: 'leo_satellites',
            name: 'LEO Спутники',
            description: 'Низкоорбитальная спутниковая связь',
            era: 5,
            cost: 200000,
            researchTime: 40,
            prerequisites: ['5g_technology'],
            unlocks: ['Глобальное покрытие', 'Спутниковая станция'],
            effect: { type: 'global_coverage', value: true },
        },
        {
            id: 'quantum_encryption',
            name: 'Квантовое шифрование',
            description: 'Абсолютная безопасность данных',
            era: 5,
            cost: 150000,
            researchTime: 35,
            prerequisites: ['xgs_pon', 'sdn'],
            unlocks: ['Репутация +20', 'Гос. контракты x3'],
            effect: { type: 'reputation_boost', value: 20 },
        },
        {
            id: 'ai_network',
            name: 'ИИ-управление сетью',
            description: 'Нейросеть оптимизирует маршруты и нагрузку',
            era: 5,
            cost: 100000,
            researchTime: 30,
            prerequisites: ['sdn', '5g_technology'],
            unlocks: ['Обслуживание -30%', 'Uptime +5%'],
            effect: { type: 'maintenance_reduction', value: 0.7 },
        },
    ],

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.currentResearch = null;
        this.researchProgress = 0;
        this.researchedTechs = ['modem_pool']; // стартовая технология
        this.researchPoints = 0;
        this.researchPerMonth = 1;
    },

    // ==========================================
    // ИССЛЕДОВАНИЯ
    // ==========================================
    startResearch(techId) {
        const tech = this.TECHNOLOGIES.find(t => t.id === techId);
        if (!tech) return false;

        // Проверки
        if (this.researchedTechs.includes(techId)) {
            UI.notify('Эта технология уже исследована!', 'warning');
            return false;
        }

        if (this.currentResearch) {
            UI.notify('Уже идёт другое исследование!', 'warning');
            return false;
        }

        // Проверяем пререквизиты
        for (const prereq of tech.prerequisites) {
            if (!this.researchedTechs.includes(prereq)) {
                const prereqTech = this.TECHNOLOGIES.find(t => t.id === prereq);
                UI.notify(`Сначала нужно исследовать: ${prereqTech?.name || prereq}`, 'warning');
                return false;
            }
        }

        // Проверяем эпоху (нужен правильный год)
        const era = this.ERAS.find(e => e.id === tech.era);
        if (era && Game.time.year < era.yearStart) {
            UI.notify(`Технология доступна с ${era.yearStart} года (эпоха "${era.name}")`, 'warning');
            return false;
        }

        // Проверяем деньги
        if (!Game.canAfford(tech.cost)) {
            UI.notify(`Недостаточно средств! Нужно ${Game.formatMoney(tech.cost)}`, 'warning');
            return false;
        }

        Game.spend(tech.cost);
        this.currentResearch = techId;
        this.researchProgress = 0;

        UI.notify(`Начато исследование: ${tech.name}`, 'info');
        return true;
    },

    cancelResearch() {
        if (!this.currentResearch) return;
        const tech = this.TECHNOLOGIES.find(t => t.id === this.currentResearch);
        // Возвращаем 50% стоимости
        if (tech) {
            Game.addMoney(Math.floor(tech.cost * 0.5));
        }
        this.currentResearch = null;
        this.researchProgress = 0;
        UI.notify('Исследование отменено. Возвращено 50% средств.', 'info');
    },

    // ==========================================
    // ЕЖЕМЕСЯЧНЫЕ ОБНОВЛЕНИЯ
    // ==========================================
    monthlyUpdate() {
        if (!this.currentResearch) return;

        const tech = this.TECHNOLOGIES.find(t => t.id === this.currentResearch);
        if (!tech) return;

        // Прогресс зависит от R&D инженеров
        const rdBonus = Economy.getStaffBonus('research');
        const progressRate = (1 + rdBonus * 0.5) / tech.researchTime;

        this.researchProgress += progressRate;

        if (this.researchProgress >= 1) {
            this.completeResearch();
        }
    },

    completeResearch() {
        const tech = this.TECHNOLOGIES.find(t => t.id === this.currentResearch);
        if (!tech) return;

        this.researchedTechs.push(this.currentResearch);
        this.applyTechEffect(tech);

        UI.notify(`✅ Исследование завершено: ${tech.name}!`, 'success');

        // Проверяем смену эпохи
        this.checkEraAdvancement();

        this.currentResearch = null;
        this.researchProgress = 0;
    },

    applyTechEffect(tech) {
        if (!tech.effect) return;

        switch (tech.effect.type) {
            case 'unlock_cable':
                // Кабель уже определён в Infrastructure.CABLE_TYPES
                UI.notify(`Разблокирован: ${Infrastructure.CABLE_TYPES[tech.effect.value]?.name || tech.effect.value}`, 'success');
                break;

            case 'unlock_tower':
                UI.notify(`Разблокирована: ${Infrastructure.TOWER_TYPES[tech.effect.value]?.name || tech.effect.value}`, 'success');
                break;

            case 'speed_boost':
                if (Infrastructure.CABLE_TYPES[tech.effect.target]) {
                    Infrastructure.CABLE_TYPES[tech.effect.target].speed *= tech.effect.value;
                }
                break;

            case 'capacity_boost':
                if (Infrastructure.CABLE_TYPES[tech.effect.target]) {
                    Infrastructure.CABLE_TYPES[tech.effect.target].maxClients = Math.floor(
                        Infrastructure.CABLE_TYPES[tech.effect.target].maxClients * tech.effect.value
                    );
                }
                break;

            case 'node_capacity':
                for (const key in Infrastructure.NODE_TYPES) {
                    Infrastructure.NODE_TYPES[key].capacity = Math.floor(
                        Infrastructure.NODE_TYPES[key].capacity * tech.effect.value
                    );
                }
                break;

            case 'tower_speed':
                if (Infrastructure.TOWER_TYPES[tech.effect.target]) {
                    Infrastructure.TOWER_TYPES[tech.effect.target].speed *= tech.effect.value;
                }
                break;

            case 'tower_radius':
                if (Infrastructure.TOWER_TYPES[tech.effect.target]) {
                    Infrastructure.TOWER_TYPES[tech.effect.target].radius = Math.ceil(
                        Infrastructure.TOWER_TYPES[tech.effect.target].radius * tech.effect.value
                    );
                }
                break;

            case 'satisfaction_boost':
                // Применяется автоматически через клиентскую систему
                break;

            case 'maintenance_reduction':
                // Снижаем стоимость обслуживания
                for (const key in Infrastructure.CABLE_TYPES) {
                    Infrastructure.CABLE_TYPES[key].maintenanceCost *= tech.effect.value;
                }
                for (const key in Infrastructure.TOWER_TYPES) {
                    Infrastructure.TOWER_TYPES[key].maintenanceCost *= tech.effect.value;
                }
                break;

            case 'reputation_boost':
                Game.state.reputation = Math.min(100, Game.state.reputation + tech.effect.value);
                break;

            case 'unlock_building':
                // Дата-центры доступны
                break;

            case 'global_coverage':
                // Особая механика спутников
                Game.state.globalCoverage = true;
                break;
        }
    },

    // ==========================================
    // ЭПОХИ
    // ==========================================
    checkEraAdvancement() {
        const currentEra = Game.state.era;
        const nextEra = this.ERAS.find(e => e.id === currentEra + 1);

        if (!nextEra) return; // уже максимальная

        // Считаем исследованные технологии текущей эпохи
        const currentEraTechs = this.TECHNOLOGIES.filter(t => t.era === currentEra);
        const researchedInEra = currentEraTechs.filter(t => this.researchedTechs.includes(t.id));

        // Нужно исследовать хотя бы 60% технологий эпохи + год
        const ratio = researchedInEra.length / currentEraTechs.length;
        if (ratio >= 0.6 && Game.time.year >= nextEra.yearStart) {
            Game.state.era = nextEra.id;
            UI.notify(`🎉 Новая эпоха: "${nextEra.name}"!`, 'success');
        }
    },

    getCurrentEra() {
        return this.ERAS.find(e => e.id === Game.state.era) || this.ERAS[0];
    },

    // ==========================================
    // ИНФОРМАЦИЯ
    // ==========================================
    getAvailableTechs() {
        return this.TECHNOLOGIES.filter(tech => {
            if (this.researchedTechs.includes(tech.id)) return false;
            if (tech.id === this.currentResearch) return false;

            // Проверяем пререквизиты
            for (const prereq of tech.prerequisites) {
                if (!this.researchedTechs.includes(prereq)) return false;
            }

            // Проверяем эпоху
            const era = this.ERAS.find(e => e.id === tech.era);
            if (era && Game.time.year < era.yearStart) return false;

            return true;
        });
    },

    getResearchProgress() {
        if (!this.currentResearch) return null;
        const tech = this.TECHNOLOGIES.find(t => t.id === this.currentResearch);
        return {
            tech,
            progress: Math.round(this.researchProgress * 100),
        };
    },

    isTechResearched(techId) {
        return this.researchedTechs.includes(techId);
    },

    isTechAvailable(techId) {
        return this.getAvailableTechs().some(t => t.id === techId);
    },

    // Проверяем разблокирован ли тип кабеля
    isCableUnlocked(cableType) {
        if (cableType === 'copper') return true; // всегда доступен
        if (cableType === 'coaxial') return true; // доступен с начала (эпоха 1)
        const tech = this.TECHNOLOGIES.find(t =>
            t.effect?.type === 'unlock_cable' && t.effect?.value === cableType
        );
        return tech ? this.researchedTechs.includes(tech.id) : false;
    },

    // Проверяем разблокирован ли тип вышки
    isTowerUnlocked(towerType) {
        if (towerType === 'wifi') {
            const tech = this.TECHNOLOGIES.find(t => t.id === 'wifi_hotspots');
            return tech ? this.researchedTechs.includes(tech.id) : false;
        }
        const tech = this.TECHNOLOGIES.find(t =>
            t.effect?.type === 'unlock_tower' && t.effect?.value === towerType
        );
        return tech ? this.researchedTechs.includes(tech.id) : false;
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            currentResearch: this.currentResearch,
            researchProgress: this.researchProgress,
            researchedTechs: this.researchedTechs,
            researchPoints: this.researchPoints,
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.currentResearch !== undefined) this.currentResearch = data.currentResearch;
        if (data.researchProgress !== undefined) this.researchProgress = data.researchProgress;
        if (data.researchedTechs) this.researchedTechs = data.researchedTechs;
        if (data.researchPoints !== undefined) this.researchPoints = data.researchPoints;

        // Применяем все исследованные эффекты
        for (const techId of this.researchedTechs) {
            const tech = this.TECHNOLOGIES.find(t => t.id === techId);
            if (tech && techId !== 'modem_pool') {
                this.applyTechEffect(tech);
            }
        }
    },
};
