// ==========================================
// ACHIEVEMENTS.JS — Система достижений
// ==========================================

const Achievements = {
    unlocked: [],
    shown: [],

    ACHIEVEMENTS: [
        { id: 'first_client', name: 'Первый клиент', icon: '👤', description: 'Подключите первого абонента', check: () => Game.state.totalClients >= 1 },
        { id: 'ten_clients', name: 'Десятка', icon: '👥', description: '10 клиентов подключено', check: () => Game.state.totalClients >= 10 },
        { id: 'fifty_clients', name: 'Полтинник', icon: '🎯', description: '50 клиентов подключено', check: () => Game.state.totalClients >= 50 },
        { id: 'hundred_clients', name: 'Сотня', icon: '💯', description: '100 клиентов!', check: () => Game.state.totalClients >= 100 },
        { id: 'thousand_clients', name: 'Тысячник', icon: '🏅', description: '1000 клиентов!', check: () => Game.state.totalClients >= 1000 },
        { id: 'first_cable', name: 'Первый кабель', icon: '🔌', description: 'Проложите первый кабель', check: () => Infrastructure.cables.length >= 1 },
        { id: 'fiber_era', name: 'Оптический век', icon: '💎', description: 'Проложите оптоволокно', check: () => Infrastructure.cables.some(c => c.type === 'fiber') },
        { id: 'first_tower', name: 'На связи', icon: '📡', description: 'Установите первую вышку', check: () => Infrastructure.towers.length >= 1 },
        { id: 'five_towers', name: 'Вышкостроитель', icon: '🗼', description: '5 вышек установлено', check: () => Infrastructure.towers.filter(t => t.active).length >= 5 },
        { id: 'datacenter', name: 'Большие данные', icon: '🏢', description: 'Постройте дата-центр', check: () => Infrastructure.datacenters.length >= 1 },
        { id: 'rich_100k', name: 'Первые 100 тысяч', icon: '💰', description: 'Накопите 100,000₽', check: () => Game.state.money >= 100000 },
        { id: 'rich_million', name: 'Миллионер', icon: '💎', description: 'Накопите 1,000,000₽', check: () => Game.state.money >= 1000000 },
        { id: 'full_coverage', name: 'Полное покрытие', icon: '🌐', description: '100% покрытие территории', check: () => (Game.state.coverage || 0) >= 100 },
        { id: 'high_reputation', name: 'Народный любимец', icon: '⭐', description: 'Репутация выше 90', check: () => Game.state.reputation >= 90 },
        { id: 'no_downtime', name: 'Железная надёжность', icon: '🛡️', description: 'Uptime 100% в течение месяца', check: () => Game.state.uptime === 100 && Game.time.totalMonths > 2 },
        { id: 'era2', name: 'Широкополосный', icon: '📶', description: 'Достигните эпохи 2', check: () => Game.state.era >= 2 },
        { id: 'era3', name: 'Мобильная революция', icon: '📱', description: 'Достигните эпохи 3', check: () => Game.state.era >= 3 },
        { id: 'era4', name: 'Облачный гигант', icon: '☁️', description: 'Достигните эпохи 4', check: () => Game.state.era >= 4 },
        { id: 'era5', name: 'Будущее сегодня', icon: '🚀', description: 'Достигните эпохи 5', check: () => Game.state.era >= 5 },
        { id: 'five_staff', name: 'Команда', icon: '👷', description: 'Наймите 5 сотрудников', check: () => Economy.staff.length >= 5 },
        { id: 'ten_staff', name: 'Корпорация', icon: '🏗️', description: '10 сотрудников в штате', check: () => Economy.staff.length >= 10 },
        { id: 'monopoly', name: 'Монополист', icon: '👑', description: '80% доли рынка', check: () => (Game.state.marketShare || 0) >= 80 },
        { id: 'expand_3', name: 'Экспансия', icon: '🗺️', description: 'Разблокируйте 3 зоны', check: () => MapSystem.zones.filter(z => z.unlocked).length >= 3 },
        { id: 'expand_all', name: 'Весь город', icon: '🌆', description: 'Разблокируйте все зоны', check: () => MapSystem.zones.filter(z => z.unlocked).length >= 9 },
        { id: 'survive_event', name: 'Выживший', icon: '🔥', description: 'Переживите 10 событий', check: () => Game.stats.eventsHandled >= 10 },
    ],

    // Проверяем каждый месяц
    check() {
        for (const ach of this.ACHIEVEMENTS) {
            if (this.unlocked.includes(ach.id)) continue;
            try {
                if (ach.check()) {
                    this.unlock(ach);
                }
            } catch (e) {
                // Пропускаем если проверка упала
            }
        }
    },

    unlock(ach) {
        this.unlocked.push(ach.id);
        if (!this.shown.includes(ach.id)) {
            this.shown.push(ach.id);
            UI.notify(`${ach.icon} Достижение: "${ach.name}"!`, 'success');
        }
    },

    getProgress() {
        return {
            unlocked: this.unlocked.length,
            total: this.ACHIEVEMENTS.length,
            percent: Math.round((this.unlocked.length / this.ACHIEVEMENTS.length) * 100),
            list: this.ACHIEVEMENTS.map(a => ({
                ...a,
                unlocked: this.unlocked.includes(a.id),
            })),
        };
    },

    serialize() {
        return { unlocked: this.unlocked };
    },

    deserialize(data) {
        if (data && data.unlocked) this.unlocked = data.unlocked;
    },
};
