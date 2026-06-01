// ==========================================
// EVENTS.JS — Система событий
// Аварии, кризисы, возможности
// ==========================================

const Events = {
    // Активные события
    activeEvents: [],
    eventHistory: [],
    eventCooldown: 0,
    totalEventsTriggered: 0,

    // Все возможные события
    EVENT_POOL: [],

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.activeEvents = [];
        this.eventHistory = [];
        this.eventCooldown = 0;
        this.totalEventsTriggered = 0;
        this.buildEventPool();
    },


    buildEventPool() {
        this.EVENT_POOL = [
            // === АВАРИИ ===
            {
                id: 'cable_break',
                name: 'Обрыв кабеля',
                icon: '⚡',
                category: 'disaster',
                description: 'Строительная техника повредила магистральный кабель!',
                chance: 0.15,
                minClients: 5,
                duration: 0,
                effect: (ev) => {
                    const cables = Infrastructure.cables.filter(c => c.active);
                    if (cables.length === 0) return false;
                    const cable = cables[Math.floor(Math.random() * cables.length)];
                    cable.health -= 40;
                    if (cable.health <= 0) { cable.active = false; cable.health = 0; }
                    Infrastructure.updateConnections();
                    return true;
                },
                choices: [
                    { text: 'Срочный ремонт (-3000₽)', action: () => { Game.spend(3000); Infrastructure.cables.forEach(c => { if (c.health < 60) c.health = Math.min(100, c.health + 50); }); Infrastructure.updateConnections(); } },
                    { text: 'Подождать (клиенты недовольны)', action: () => { Game.state.reputation -= 3; } },
                ],
            },
            {
                id: 'storm',
                name: 'Сильный шторм',
                icon: '🌩️',
                category: 'disaster',
                description: 'Ураган повредил несколько вышек и линии!',
                chance: 0.08,
                minClients: 10,
                duration: 0,
                effect: (ev) => {
                    let damaged = 0;
                    Infrastructure.towers.forEach(t => {
                        if (t.active && Math.random() < 0.4) { t.health -= 30; damaged++; }
                    });
                    Infrastructure.cables.forEach(c => {
                        if (c.active && Math.random() < 0.2) { c.health -= 20; }
                    });
                    Infrastructure.updateConnections();
                    return damaged > 0;
                },
                choices: [
                    { text: 'Аварийные бригады (-5000₽)', action: () => { Game.spend(5000); Infrastructure.towers.forEach(t => { t.health = Math.min(100, t.health + 40); }); } },
                    { text: 'Чинить постепенно', action: () => { Game.state.reputation -= 5; } },
                ],
            },


            {
                id: 'ddos_attack',
                name: 'DDoS-атака',
                icon: '🔒',
                category: 'disaster',
                description: 'Ваша сеть под массированной DDoS-атакой!',
                chance: 0.06,
                minClients: 30,
                duration: 3,
                effect: () => { Game.state.uptime -= 15; return true; },
                choices: [
                    { text: 'Купить защиту (-8000₽)', action: () => { Game.spend(8000); Game.state.uptime = Math.min(100, Game.state.uptime + 15); } },
                    { text: 'Переждать (3 дня простоя)', action: () => { Game.state.reputation -= 8; } },
                ],
            },
            {
                id: 'hacker_attack',
                name: 'Хакерская атака',
                icon: '💀',
                category: 'disaster',
                description: 'Хакеры получили доступ к данным клиентов!',
                chance: 0.04,
                minClients: 50,
                duration: 0,
                effect: () => { Game.state.reputation -= 10; return true; },
                choices: [
                    { text: 'Нанять экспертов (-15000₽)', action: () => { Game.spend(15000); Game.state.reputation += 5; } },
                    { text: 'Скрыть инцидент (риск!)', action: () => { if (Math.random() < 0.5) { Game.state.reputation -= 15; UI.notify('Утечка попала в прессу!', 'danger'); } } },
                ],
            },
            {
                id: 'power_outage',
                name: 'Отключение электричества',
                icon: '🔌',
                category: 'disaster',
                description: 'Район обесточен! Узлы без питания.',
                chance: 0.1,
                minClients: 5,
                duration: 1,
                effect: () => {
                    Infrastructure.nodes.forEach(n => { if (Math.random() < 0.3) n.active = false; });
                    Infrastructure.updateConnections();
                    return true;
                },
                choices: [
                    { text: 'Генераторы (-2000₽)', action: () => { Game.spend(2000); Infrastructure.nodes.forEach(n => n.active = true); Infrastructure.updateConnections(); } },
                    { text: 'Ждать восстановления', action: () => { setTimeout(() => { Infrastructure.nodes.forEach(n => n.active = true); Infrastructure.updateConnections(); }, 5000); } },
                ],
            },


            // === ВОЗМОЖНОСТИ ===
            {
                id: 'gov_contract',
                name: 'Государственный контракт',
                icon: '🏛️',
                category: 'opportunity',
                description: 'Администрация предлагает подключить школы и больницы!',
                chance: 0.05,
                minClients: 20,
                duration: 0,
                effect: () => true,
                choices: [
                    { text: 'Принять контракт', action: () => { Game.addMoney(20000); Game.state.reputation += 5; UI.notify('+20,000₽ и +5 репутации!', 'success'); } },
                    { text: 'Отказаться', action: () => {} },
                ],
            },
            {
                id: 'new_district',
                name: 'Новый жилой комплекс',
                icon: '🏗️',
                category: 'opportunity',
                description: 'Строится новый ЖК на 200 квартир. Эксклюзивный контракт!',
                chance: 0.06,
                minClients: 30,
                duration: 0,
                effect: () => true,
                choices: [
                    { text: 'Заключить контракт (-10000₽)', action: () => { Game.spend(10000); Game.state.reputation += 3; AI.city.population += 200; UI.notify('Эксклюзивный контракт! +200 потенциальных клиентов', 'success'); } },
                    { text: 'Пропустить', action: () => {} },
                ],
            },
            {
                id: 'equipment_sale',
                name: 'Распродажа оборудования',
                icon: '🏷️',
                category: 'opportunity',
                description: 'Поставщик проводит ликвидацию склада — скидка 50%!',
                chance: 0.08,
                minClients: 0,
                duration: 5,
                effect: () => true,
                choices: [
                    { text: 'Закупить впрок (-5000₽)', action: () => { Game.spend(5000); UI.notify('Запасы оборудования пополнены! Следующие 5 построек со скидкой.', 'success'); } },
                    { text: 'Не нужно', action: () => {} },
                ],
            },
            {
                id: 'investor_interest',
                name: 'Интерес инвестора',
                icon: '💼',
                category: 'opportunity',
                description: 'Инвестор предлагает финансирование в обмен на долю.',
                chance: 0.04,
                minClients: 50,
                duration: 0,
                effect: () => true,
                choices: [
                    { text: 'Принять (+50000₽, -10% дохода)', action: () => { Game.addMoney(50000); UI.notify('Инвестиция получена! Доход уменьшен на 10%.', 'info'); } },
                    { text: 'Отказать', action: () => { Game.state.reputation += 2; } },
                ],
            },


            // === РЫНОЧНЫЕ СОБЫТИЯ ===
            {
                id: 'viral_content',
                name: 'Вирусный контент',
                icon: '📺',
                category: 'market',
                description: 'Выход нового сериала — трафик вырос в 3 раза!',
                chance: 0.1,
                minClients: 20,
                duration: 7,
                effect: () => { return true; },
                choices: [
                    { text: 'Расширить каналы (-3000₽)', action: () => { Game.spend(3000); Game.state.reputation += 2; } },
                    { text: 'Терпеть просадки', action: () => { Game.state.reputation -= 3; } },
                ],
            },
            {
                id: 'pandemic',
                name: 'Пандемия',
                icon: '🦠',
                category: 'market',
                description: 'Все работают из дома — спрос на интернет x3!',
                chance: 0.02,
                minClients: 50,
                duration: 30,
                effect: () => { AI.market.growthRate = 0.08; return true; },
                choices: [
                    { text: 'Мобилизовать ресурсы (-10000₽)', action: () => { Game.spend(10000); Game.state.reputation += 10; } },
                    { text: 'Работать в штатном режиме', action: () => { Game.state.reputation -= 5; } },
                ],
            },
            {
                id: 'regulation_change',
                name: 'Новое регулирование',
                icon: '📋',
                category: 'market',
                description: 'Государство требует обеспечить покрытие сельских районов.',
                chance: 0.04,
                minClients: 40,
                duration: 60,
                effect: () => true,
                choices: [
                    { text: 'Выполнить требования', action: () => { Game.state.reputation += 8; UI.notify('Репутация повышена за сотрудничество с властями!', 'success'); } },
                    { text: 'Заплатить штраф (-8000₽)', action: () => { Game.spend(8000); } },
                ],
            },
            {
                id: 'competitor_bankruptcy',
                name: 'Банкротство конкурента',
                icon: '📉',
                category: 'market',
                description: 'Мелкий провайдер закрывается. Его клиенты ищут нового!',
                chance: 0.05,
                minClients: 20,
                duration: 0,
                effect: () => { AI.market.totalDemand += 50; return true; },
                choices: [
                    { text: 'Рекламная кампания (-3000₽)', action: () => { Game.spend(3000); Game.state.reputation += 3; } },
                    { text: 'Пусть сами найдут', action: () => {} },
                ],
            },


            // === ПЕРСОНАЛ ===
            {
                id: 'staff_strike',
                name: 'Забастовка персонала',
                icon: '✊',
                category: 'staff',
                description: 'Сотрудники требуют повышения зарплаты!',
                chance: 0.05,
                minClients: 30,
                duration: 0,
                effect: () => Economy.staff.length > 3,
                choices: [
                    { text: 'Повысить зарплаты (+20%)', action: () => { Economy.staff.forEach(s => s.salary = Math.floor(s.salary * 1.2)); UI.notify('Зарплаты повышены. Мораль восстановлена!', 'success'); Economy.staff.forEach(s => s.morale = 100); } },
                    { text: 'Отказать (мораль -30)', action: () => { Economy.staff.forEach(s => s.morale = Math.max(10, s.morale - 30)); } },
                ],
            },
            {
                id: 'talented_hire',
                name: 'Талантливый специалист',
                icon: '🌟',
                category: 'staff',
                description: 'Опытный инженер ищет работу. Берём?',
                chance: 0.06,
                minClients: 10,
                duration: 0,
                effect: () => true,
                choices: [
                    { text: 'Нанять (-5000₽)', action: () => { Game.spend(5000); Economy.staff.push({ id: Date.now(), type: 'engineer', name: Economy.generateStaffName(), salary: 7000, experience: 20, morale: 90, efficiency: 1.3, hiredDate: {...Game.time}, skills: ['network', 'optimization', 'research'] }); UI.notify('Нанят опытный инженер!', 'success'); } },
                    { text: 'Не нужен', action: () => {} },
                ],
            },

            // === ТЕХНОЛОГИЧЕСКИЕ ===
            {
                id: 'tech_breakthrough',
                name: 'Научный прорыв',
                icon: '🔬',
                category: 'tech',
                description: 'Ваш R&D отдел совершил прорыв! Исследование ускорено.',
                chance: 0.04,
                minClients: 20,
                duration: 0,
                effect: () => Tech.currentResearch !== null,
                choices: [
                    { text: 'Отлично!', action: () => { Tech.researchProgress = Math.min(1, Tech.researchProgress + 0.3); UI.notify('Прогресс исследования +30%!', 'success'); } },
                ],
            },
            {
                id: 'equipment_failure',
                name: 'Массовый брак оборудования',
                icon: '🔧',
                category: 'tech',
                description: 'Партия оборудования оказалась бракованной!',
                chance: 0.05,
                minClients: 10,
                duration: 0,
                effect: () => {
                    Infrastructure.cables.forEach(c => { if (c.active && Math.random() < 0.15) c.health -= 25; });
                    return true;
                },
                choices: [
                    { text: 'Замена по гарантии (ждать 5 дней)', action: () => { UI.notify('Замена будет через 5 дней', 'info'); } },
                    { text: 'Купить новое (-6000₽)', action: () => { Game.spend(6000); Infrastructure.cables.forEach(c => { if (c.health < 80) c.health = 100; }); } },
                ],
            },
            // === НОВЫЕ СОБЫТИЯ (14 шт) ===
            { id: 'fiber_demand', name: 'Спрос на оптику', icon: '💎', category: 'market', description: 'Клиенты массово требуют скорость выше 100 Мбит!', chance: 0.06, minClients: 40, duration: 0, effect: () => Game.time.year >= 2008, choices: [{ text: 'Начать модернизацию (+3 репут.)', action: () => { Game.state.reputation += 3; } }, { text: 'Пока и так сойдёт (-4 репут.)', action: () => { Game.state.reputation -= 4; } }] },
            { id: 'social_media_boom', name: 'Бум соцсетей', icon: '📱', category: 'market', description: 'Новая социальная сеть набирает популярность — трафик x3!', chance: 0.08, minClients: 25, duration: 14, effect: () => true, choices: [{ text: 'Увеличить полосу (-4000₽)', action: () => { Game.spend(4000); Game.state.reputation += 4; } }, { text: 'Ограничить трафик (-6 репут.)', action: () => { Game.state.reputation -= 6; } }] },
            { id: 'city_dig', name: 'Ремонт дорог', icon: '🚧', category: 'disaster', description: 'Город ремонтирует дороги — задели подземные коммуникации!', chance: 0.07, minClients: 15, duration: 0, effect: () => { Infrastructure.cables.forEach(c => { if (c.active && Math.random() < 0.2) c.health -= 30; }); return true; }, choices: [{ text: 'Потребовать компенсацию (+5000₽)', action: () => { Game.addMoney(5000); } }, { text: 'Починить (-3000₽)', action: () => { Game.spend(3000); Infrastructure.cables.forEach(c => { if (c.health < 70) c.health = 100; }); } }] },
            { id: 'esports_tournament', name: 'Киберспортивный турнир', icon: '🎮', category: 'opportunity', description: 'В городе крупный турнир. Стать спонсором?', chance: 0.04, minClients: 30, duration: 0, effect: () => true, choices: [{ text: 'Спонсировать (-8000₽, +8 репут.)', action: () => { Game.spend(8000); Game.state.reputation += 8; } }, { text: 'Пропустить', action: () => {} }] },
            { id: 'copper_theft', name: 'Кража кабеля', icon: '🦹', category: 'disaster', description: 'Воры украли медный кабель! Район без связи.', chance: 0.06, minClients: 10, duration: 0, effect: () => { const c = Infrastructure.cables.find(c => c.active && c.type === 'copper'); if (c) { c.active = false; c.health = 0; Infrastructure.updateConnections(); return true; } return false; }, choices: [{ text: 'Заменить оптикой (-5000₽)', action: () => { Game.spend(5000); } }, { text: 'Восстановить медь (-2000₽)', action: () => { Game.spend(2000); Infrastructure.cables.forEach(c => { if (!c.active && c.type === 'copper') { c.active = true; c.health = 80; } }); Infrastructure.updateConnections(); } }] },
            { id: 'winter_freeze', name: 'Сильные морозы', icon: '🥶', category: 'disaster', description: 'Температура -30°! Оборудование перемерзает.', chance: 0.05, minClients: 10, duration: 5, effect: () => (Game.time.month === 12 || Game.time.month <= 2), choices: [{ text: 'Обогреватели (-4000₽)', action: () => { Game.spend(4000); } }, { text: 'Терпеть (-20 HP вышкам)', action: () => { Infrastructure.towers.forEach(t => { if (t.active) t.health -= 20; }); Game.state.reputation -= 3; } }] },
            { id: 'startup_partnership', name: 'Партнёрство со стартапом', icon: '🚀', category: 'opportunity', description: 'IT-стартап предлагает сотрудничество.', chance: 0.05, minClients: 20, duration: 0, effect: () => true, choices: [{ text: 'Согласиться (+3 репут.)', action: () => { Game.state.reputation += 3; } }, { text: 'Только за деньги (+3000₽)', action: () => { Game.addMoney(3000); } }] },
            { id: 'influencer_review', name: 'Обзор блогера', icon: '📹', category: 'market', description: 'Популярный блогер хочет обзор вашего провайдера!', chance: 0.04, minClients: 30, duration: 0, effect: () => true, choices: [{ text: 'Дать VIP-тариф', action: () => { if (Game.state.uptime > 95) { Game.state.reputation += 10; UI.notify('Отличный обзор! +10 репут.', 'success'); } else { Game.state.reputation -= 5; UI.notify('Блогер показал просадки...', 'danger'); } } }, { text: 'Отказать', action: () => {} }] },
            { id: 'school_program', name: 'Программа "Школьный интернет"', icon: '🎓', category: 'opportunity', description: 'Госпрограмма подключения школ. Участвуете?', chance: 0.04, minClients: 25, duration: 0, effect: () => true, choices: [{ text: 'Участвовать (+15000₽, +7 репут.)', action: () => { Game.addMoney(15000); Game.state.reputation += 7; } }, { text: 'Мало платят', action: () => {} }] },
            { id: 'employee_quit', name: 'Увольнение сотрудника', icon: '🚪', category: 'staff', description: 'Лучший инженер получил оффер от конкурента!', chance: 0.05, minClients: 20, duration: 0, effect: () => Economy.staff.length > 2, choices: [{ text: 'Повысить зарплату (+50%)', action: () => { if (Economy.staff.length > 0) { const b = Economy.staff.reduce((a, s) => s.efficiency > a.efficiency ? s : a); b.salary = Math.floor(b.salary * 1.5); } } }, { text: 'Отпустить', action: () => { if (Economy.staff.length > 0) Economy.staff.pop(); } }] },
            { id: 'heat_wave', name: 'Аномальная жара', icon: '🌡️', category: 'disaster', description: 'Серверные перегреваются! Температура критическая.', chance: 0.05, minClients: 15, duration: 3, effect: () => Game.time.month >= 6 && Game.time.month <= 8, choices: [{ text: 'Доп. охлаждение (-5000₽)', action: () => { Game.spend(5000); } }, { text: 'Терпеть (-10 uptime)', action: () => { Game.state.uptime = Math.max(50, Game.state.uptime - 10); Game.state.reputation -= 3; } }] },
            { id: 'network_award', name: 'Награда "Лучший провайдер"', icon: '🏆', category: 'opportunity', description: 'Вас номинировали на награду!', chance: 0.03, minClients: 60, duration: 0, effect: () => Game.state.reputation > 70, choices: [{ text: 'Принять награду (+10 репут.)', action: () => { Game.state.reputation = Math.min(100, Game.state.reputation + 10); } }] },
            { id: 'price_war', name: 'Ценовая война', icon: '⚔️', category: 'market', description: 'Конкурент снизил цены на 40%! Клиенты уходят.', chance: 0.05, minClients: 35, duration: 14, effect: () => AI.competitors.filter(c => c.alive).length > 0, choices: [{ text: 'Ответить скидкой', action: () => { Economy.tariffs.forEach(t => t.price = Math.floor(t.price * 0.8)); } }, { text: 'Упор на качество (+3 репут.)', action: () => { Game.state.reputation += 3; } }] },
            { id: 'flood', name: 'Наводнение', icon: '🌊', category: 'disaster', description: 'Подвалы затоплены! Оборудование в узлах под угрозой.', chance: 0.04, minClients: 20, duration: 2, effect: () => Game.time.month >= 3 && Game.time.month <= 5, choices: [{ text: 'Эвакуация оборудования (-6000₽)', action: () => { Game.spend(6000); } }, { text: 'Рискнуть', action: () => { Infrastructure.nodes.forEach(n => { if (Math.random() < 0.3) { n.health -= 40; if (n.health <= 0) n.active = false; } }); Infrastructure.updateConnections(); } }] },
        ];
    },


    // ==========================================
    // ОБНОВЛЕНИЯ
    // ==========================================
    update() {
        // Уменьшаем кулдаун
        if (this.eventCooldown > 0) {
            this.eventCooldown--;
        }

        // Обновляем активные события (длительность)
        for (let i = this.activeEvents.length - 1; i >= 0; i--) {
            const ev = this.activeEvents[i];
            if (ev.remainingDays > 0) {
                ev.remainingDays--;
                if (ev.remainingDays <= 0) {
                    this.activeEvents.splice(i, 1);
                }
            }
        }
    },

    dailyCheck() {
        if (this.eventCooldown > 0) return;

        const diffSettings = Game.getDiffSettings();
        const baseChance = 0.03 * diffSettings.eventFrequency;

        if (Math.random() > baseChance) return;

        // Выбираем случайное подходящее событие (без вызова effect — он только в triggerEvent)
        const eligible = this.EVENT_POOL.filter(ev => {
            if (Game.state.totalClients < ev.minClients) return false;
            // Не повторяем недавние
            const recent = this.eventHistory.slice(-5);
            if (recent.find(h => h.id === ev.id)) return false;
            // Только шанс, без side-effects
            return Math.random() < ev.chance;
        });

        if (eligible.length === 0) return;

        const event = eligible[Math.floor(Math.random() * eligible.length)];
        this.triggerEvent(event);
    },

    triggerEvent(eventDef) {
        // Проверяем условие
        if (eventDef.effect && !eventDef.effect(eventDef)) return;

        const event = {
            id: eventDef.id,
            name: eventDef.name,
            icon: eventDef.icon,
            category: eventDef.category,
            description: eventDef.description,
            choices: eventDef.choices,
            remainingDays: eventDef.duration || 0,
            triggeredAt: { ...Game.time },
        };

        this.activeEvents.push(event);
        this.eventHistory.push({ id: event.id, day: Game.time.totalDays });
        this.totalEventsTriggered++;
        this.eventCooldown = 30; // минимум 30 тиков между событиями

        // Показываем диалог
        UI.showEventDialog(event);
        Game.stats.eventsHandled++;
    },

    // Принять решение по событию
    resolveEvent(eventIndex, choiceIndex) {
        const event = this.activeEvents[eventIndex];
        if (!event || !event.choices[choiceIndex]) return;

        event.choices[choiceIndex].action();

        // Если событие одноразовое — удаляем
        if (event.remainingDays <= 0) {
            this.activeEvents.splice(eventIndex, 1);
        }
    },


    // ==========================================
    // ИНФОРМАЦИЯ
    // ==========================================
    getActiveEvents() {
        return this.activeEvents;
    },

    getEventHistory() {
        return this.eventHistory.slice(-20);
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            activeEvents: this.activeEvents.map(e => ({
                id: e.id, name: e.name, icon: e.icon,
                category: e.category, description: e.description,
                remainingDays: e.remainingDays,
                triggeredAt: e.triggeredAt,
            })),
            eventHistory: this.eventHistory,
            eventCooldown: this.eventCooldown,
            totalEventsTriggered: this.totalEventsTriggered,
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.eventHistory) this.eventHistory = data.eventHistory;
        if (data.eventCooldown) this.eventCooldown = data.eventCooldown;
        if (data.totalEventsTriggered) this.totalEventsTriggered = data.totalEventsTriggered;
        // Active events без функций — просто отображаем
        if (data.activeEvents) {
            this.activeEvents = data.activeEvents;
        }
    },
};
