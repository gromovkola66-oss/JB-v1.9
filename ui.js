// ==========================================
// UI.JS — Управление интерфейсом
// Экраны, вкладки, модальные окна, уведомления
// ==========================================

const UI = {
    currentTool: 'select',
    currentTab: 'overview',
    notifications: [],
    selectedDifficulty: 'normal',
    selectedSlot: 1,

    // ==========================================
    // НАВИГАЦИЯ ЭКРАНОВ
    // ==========================================
    showMainMenu() {
        this.hideAllScreens();
        document.getElementById('mainMenu').classList.add('active');
        document.getElementById('gameMenuOverlay').classList.add('hidden');
    },

    showNewGame() {
        this.hideAllScreens();
        document.getElementById('newGameScreen').classList.add('active');
    },

    showLoadGame() {
        this.hideAllScreens();
        document.getElementById('loadGameScreen').classList.add('active');
        this.renderSaveSlots();
    },

    showGameScreen() {
        this.hideAllScreens();
        document.getElementById('gameScreen').classList.add('active');
        Renderer.resizeCanvas();
    },

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    },

    showGameMenu() {
        Game.paused = true;
        document.getElementById('gameMenuOverlay').classList.remove('hidden');
        this.updateTimeButtons();
    },

    closeGameMenu() {
        document.getElementById('gameMenuOverlay').classList.add('hidden');
        Game.paused = false;
        this.updateTimeButtons();
    },

    showSettings() {
        // Простые настройки через модальное окно
        this.showModal(`
            <h3>Настройки</h3>
            <div style="margin:20px 0">
                <p style="color:var(--text-dim)">Управление:</p>
                <p>WASD — перемещение камеры</p>
                <p>Колёсико — зум</p>
                <p>Alt+ЛКМ — перетаскивание</p>
                <p>Пробел — пауза</p>
                <p>1/2/3 — скорость</p>
            </div>
            <button class="btn btn-secondary" onclick="UI.closeModal()">Закрыть</button>
        `);
    },


    // ==========================================
    // СЛОЖНОСТЬ И СЛОТЫ
    // ==========================================
    selectDifficulty(diff) {
        this.selectedDifficulty = diff;
        Game.difficulty = diff;
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.diff-btn[data-diff="${diff}"]`)?.classList.add('selected');
    },

    selectSlot(slot) {
        this.selectedSlot = slot;
        Game.slot = slot;
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector(`.slot-btn[data-slot="${slot}"]`)?.classList.add('selected');
    },

    renderSaveSlots() {
        const container = document.getElementById('saveSlotsList');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 1; i <= 3; i++) {
            const info = Game.getSaveInfo(i);
            const div = document.createElement('div');
            div.className = `save-slot-item ${info ? '' : 'empty'}`;

            if (info) {
                div.innerHTML = `
                    <div>
                        <strong>${info.companyName}</strong><br>
                        <small style="color:var(--text-dim)">${info.date} | ${Game.formatMoney(info.money)} | ${info.clients} клиентов</small>
                    </div>
                    <div>
                        <button class="btn-small" onclick="Game.load(${i})">Загрузить</button>
                        <button class="btn-small" style="background:var(--danger)" onclick="Game.deleteSave(${i}); UI.renderSaveSlots()">✕</button>
                    </div>
                `;
            } else {
                div.innerHTML = `<div><span style="color:var(--text-dim)">Слот ${i} — пусто</span></div>`;
            }
            container.appendChild(div);
        }
    },

    // ==========================================
    // ИНСТРУМЕНТЫ
    // ==========================================
    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tool-btn[data-tool="${tool}"]`)?.classList.add('active');

        // Отмена текущей прокладки кабеля
        if (tool !== 'cable') {
            Infrastructure.cancelCable();
        }

        // Туториал триггер
        if (tool === 'cable') Tutorial.trigger('tool_cable');
    },

    // ==========================================
    // ВКЛАДКИ
    // ==========================================
    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(`tab-${tab}`)?.classList.add('active');

        // Обновляем содержимое вкладки
        this.updateTab(tab);

        // Туториал триггеры
        if (tab === 'tariffs') Tutorial.trigger('tab_tariffs');
        if (tab === 'finance') Tutorial.trigger('tab_finance');
    },

    updateTab(tab) {
        switch (tab) {
            case 'overview': this.updateOverview(); break;
            case 'tariffs': this.updateTariffs(); break;
            case 'staff': this.updateStaff(); break;
            case 'tech': this.updateTech(); break;
            case 'finance': this.updateFinance(); break;
            case 'competitors': this.updateCompetitors(); break;
            case 'achievements': this.updateAchievements(); break;
        }
    },

    updateAchievements() {
        const container = document.getElementById('achievementsList');
        const progressEl = document.getElementById('achProgress');
        if (!container) return;

        const data = Achievements.getProgress();
        if (progressEl) progressEl.textContent = `${data.unlocked} / ${data.total}`;

        container.innerHTML = data.list.map(a => `
            <div class="ach-item ${a.unlocked ? 'unlocked' : 'locked'}">
                <span class="ach-item-icon">${a.unlocked ? a.icon : '🔒'}</span>
                <span class="ach-item-text">
                    <span class="ach-item-name">${a.name}</span>
                    <span class="ach-item-desc">${a.description}</span>
                </span>
            </div>
        `).join('');
    },


    // ==========================================
    // ОБНОВЛЕНИЯ UI
    // ==========================================
    updateAll() {
        this.updateTopBar();
        this.updateTab(this.currentTab);
    },

    updateTopBar() {
        const s = Game.state;
        const t = Game.time;

        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

        el('companyNameDisplay', s.companyName);
        el('eraDisplay', `📶 ${Game.getEraName(s.era)}`);
        el('moneyDisplay', Game.formatMoney(s.money));
        el('clientsDisplay', s.totalClients);
        el('incomeDisplay', (s.totalIncome - s.totalExpense >= 0 ? '+' : '') + Game.formatMoney(s.totalIncome - s.totalExpense));
        el('uptimeDisplay', s.uptime + '%');
        el('reputationDisplay', s.reputation);
        el('dateDisplay', `${Game.getMonthName(t.month)} ${t.year}`);

        // Цветовая индикация баланса
        const moneyEl = document.getElementById('moneyDisplay');
        if (moneyEl) {
            moneyEl.style.color = s.money < 0 ? 'var(--danger)' : s.money < 5000 ? 'var(--warning)' : 'var(--text-bright)';
        }
        // Цветовая индикация прибыли
        const incomeEl = document.getElementById('incomeDisplay');
        if (incomeEl) {
            const profit = s.totalIncome - s.totalExpense;
            incomeEl.style.color = profit > 0 ? 'var(--income)' : profit < 0 ? 'var(--expense)' : 'var(--text-bright)';
        }
    },

    updateTimeButtons() {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        if (Game.paused) {
            document.getElementById('pauseBtn')?.classList.add('active');
        } else {
            const id = `speed${Game.speed === 1 ? '1' : Game.speed === 2 ? '2' : '5'}Btn`;
            document.getElementById(id)?.classList.add('active');
        }
    },

    updateOverview() {
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('overviewClients', Game.state.totalClients);
        el('overviewCoverage', (Game.state.coverage || 0) + '%');
        el('overviewSpeed', Infrastructure.getAverageSpeed() + ' Мбит');
        el('overviewSatisfaction', Clients.getAverageSatisfaction() + '%');
    },

    updateTariffs() {
        const container = document.getElementById('tariffsList');
        if (!container) return;
        container.className = 'content-list';
        if (Economy.tariffs.length === 0) {
            container.innerHTML = '<div class="empty-hint">Нет тарифов. Создайте первый тариф!</div>';
            return;
        }
        container.innerHTML = Economy.tariffs.map((t, i) => `
            <div class="card">
                <div class="card-row">
                    <div>
                        <div class="card-title">${t.name}</div>
                        <div class="card-sub">⚡ ${t.speed} Мбит · ${t.dataLimit ? t.dataLimit + ' ГБ' : '∞ безлимит'}</div>
                    </div>
                    <div class="card-price">${t.price} ₽</div>
                </div>
                <div class="card-row" style="margin-top:8px">
                    <span class="card-badge">👥 ${t.subscribers || 0} абон.</span>
                    <button class="card-action danger" style="width:auto;margin:0;padding:4px 10px" onclick="Economy.deleteTariff(${i}); UI.updateTariffs();">Удалить</button>
                </div>
            </div>
        `).join('');
    },

    updateStaff() {
        const container = document.getElementById('staffList');
        if (!container) return;
        container.className = 'content-list';
        if (Economy.staff.length === 0) {
            container.innerHTML = '<div class="empty-hint">Нет сотрудников. Наймите персонал для роста компании!</div>';
            return;
        }
        const icons = { technician: '🔧', engineer: '🛠️', support: '🎧', sales: '💼', marketer: '📣', accountant: '🧮', lawyer: '⚖️', researcher: '🔬' };
        container.innerHTML = Economy.staff.map((s, i) => {
            const moraleClass = s.morale > 66 ? 'green' : s.morale > 33 ? 'orange' : 'red';
            const typeName = Economy.STAFF_TYPES[s.type]?.name || s.type;
            return `
            <div class="card">
                <div class="card-row">
                    <div>
                        <div class="card-title">${icons[s.type] || '👤'} ${s.name}</div>
                        <div class="card-sub">${typeName} · опыт ${s.experience} мес</div>
                    </div>
                    <div class="card-price" style="font-size:0.85em">${Game.formatMoney(s.salary)}</div>
                </div>
                <div class="card-sub" style="margin-top:8px">Мораль: ${Math.round(s.morale)}%</div>
                <div class="bar-track"><div class="bar-fill ${moraleClass}" style="width:${s.morale}%"></div></div>
                <button class="card-action danger" onclick="Economy.fireStaff(${i}); UI.updateStaff();">Уволить</button>
            </div>`;
        }).join('');
    },

    updateTech() {
        const container = document.getElementById('techTree');
        if (!container) return;

        const progress = Tech.getResearchProgress();
        const available = Tech.getAvailableTechs();

        let html = '';
        if (progress) {
            html += `<div class="research-banner">
                <div class="card-row">
                    <div class="card-title">🔬 Исследуется: ${progress.tech.name}</div>
                    <span class="card-badge">${progress.progress}%</span>
                </div>
                <div class="bar-track"><div class="bar-fill" style="width:${progress.progress}%"></div></div>
            </div>`;
        }

        if (available.length === 0 && !progress) {
            html += '<div class="empty-hint">Нет доступных технологий. Дождитесь новой эпохи!</div>';
        }

        html += '<div class="content-list">';
        for (const tech of available) {
            const era = Tech.ERAS.find(e => e.id === tech.era);
            const affordable = Game.canAfford(tech.cost);
            html += `<div class="card tech-card" onclick="Tech.startResearch('${tech.id}'); UI.updateTech();">
                <span class="tech-era">Эпоха ${tech.era}</span>
                <div class="card-title">${tech.name}</div>
                <div class="card-sub">${tech.description}</div>
                <div class="card-row" style="margin-top:8px">
                    <span class="card-price" style="font-size:0.9em; color:${affordable ? 'var(--accent)' : 'var(--danger)'}">${Game.formatMoney(tech.cost)}</span>
                    <span class="card-badge">⏱ ${tech.researchTime} мес</span>
                </div>
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    updateFinance() {
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('financeIncome', Game.formatMoney(Economy.monthlyReport.income) + '/мес');
        el('financeExpense', Game.formatMoney(Economy.monthlyReport.expense) + '/мес');
        el('financeProfit', Game.formatMoney(Economy.monthlyReport.profit) + '/мес');
    },

    updateCompetitors() {
        const container = document.getElementById('competitorsList');
        if (!container) return;
        container.className = 'content-list';
        const comps = AI.getCompetitorComparison();
        if (comps.length === 0) { container.innerHTML = '<div class="empty-hint">Конкурентов нет — вы монополист!</div>'; return; }
        container.innerHTML = comps.map(c => {
            const relClass = c.relation === 'Дружелюбный' ? 'friendly' : c.relation === 'Враждебный' ? 'hostile' : 'neutral';
            return `
            <div class="card competitor-card" style="border-left-color:${c.color}">
                <div class="card-row">
                    <div class="card-title">${c.icon} ${c.name}</div>
                    <span class="relation-tag ${relClass}">${c.relation}</span>
                </div>
                <div class="card-sub" style="margin-top:6px">${c.style}</div>
                <div class="card-row" style="margin-top:8px">
                    <span class="card-badge">👥 ${c.clients}</span>
                    <span class="card-badge">📊 ${c.marketShare}%</span>
                    <span class="card-badge">⚡ ${c.avgSpeed} Мбит</span>
                </div>
                ${c.lastAction ? `<div class="card-sub" style="margin-top:6px;color:var(--warning)">⚠️ ${c.lastAction}</div>` : ''}
            </div>`;
        }).join('');
    },


    // ==========================================
    // МОДАЛЬНЫЕ ОКНА
    // ==========================================
    showModal(html) {
        document.getElementById('modalContent').innerHTML = html;
        document.getElementById('modalOverlay').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
    },

    showCreateTariff() {
        this.showModal(`
            <h3>Создать тариф</h3>
            <div class="form-group"><label>Название:</label><input type="text" id="newTariffName" placeholder="Мой тариф"></div>
            <div class="form-group"><label>Скорость (Мбит/с):</label><input type="number" id="newTariffSpeed" value="10" min="1"></div>
            <div class="form-group"><label>Лимит трафика (ГБ, 0=безлимит):</label><input type="number" id="newTariffLimit" value="0" min="0"></div>
            <div class="form-group"><label>Цена (₽/мес):</label><input type="number" id="newTariffPrice" value="500" min="100"></div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="UI.createTariff()">Создать</button>
                <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
            </div>
        `);
    },

    createTariff() {
        const name = document.getElementById('newTariffName').value || 'Тариф';
        const speed = parseInt(document.getElementById('newTariffSpeed').value) || 10;
        const limit = parseInt(document.getElementById('newTariffLimit').value) || 0;
        const price = parseInt(document.getElementById('newTariffPrice').value) || 500;
        Economy.createTariff(name, speed, limit, price);
        this.closeModal();
        this.updateTariffs();
    },

    showHireStaff() {
        const types = Object.entries(Economy.STAFF_TYPES);
        let html = '<h3>Нанять сотрудника</h3><div style="display:grid;gap:8px;margin:16px 0">';
        for (const [key, type] of types) {
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-dark);border-radius:6px">
                <div><strong>${type.name}</strong><br><small style="color:var(--text-dim)">${type.description}</small></div>
                <button class="btn-small" onclick="Economy.hireStaff('${key}'); UI.closeModal(); UI.updateStaff();">${Game.formatMoney(type.baseSalary)}/мес</button>
            </div>`;
        }
        html += '</div><button class="btn btn-secondary" onclick="UI.closeModal()">Закрыть</button>';
        this.showModal(html);
    },

    showEventDialog(event) {
        let html = `<h3>${event.icon} ${event.name}</h3><p style="margin:16px 0;color:var(--text-dim)">${event.description}</p>`;
        html += '<div style="display:flex;flex-direction:column;gap:8px">';
        if (event.choices) {
            event.choices.forEach((choice, i) => {
                html += `<button class="btn btn-secondary" onclick="Events.resolveEvent(${Events.activeEvents.indexOf(event)}, ${i}); UI.closeModal();">${choice.text}</button>`;
            });
        }
        html += '</div>';
        this.showModal(html);
    },

    showZoneUnlockDialog(zone) {
        this.showModal(`
            <h3>🗺️ Разблокировать зону</h3>
            <p style="margin:16px 0">Открыть территорию "<strong>${zone.name}</strong>"?</p>
            <p style="color:var(--accent);font-size:1.2em;margin-bottom:16px">${Game.formatMoney(zone.cost)}</p>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="MapSystem.unlockZone(${zone.id}); UI.closeModal();">Открыть</button>
                <button class="btn btn-secondary" onclick="UI.closeModal()">Отмена</button>
            </div>
        `);
    },

    showTileInfo(x, y) {
        const tile = MapSystem.getTile(x, y);
        if (!tile) return;
        const building = tile.building;
        const infra = Infrastructure.getInfraInfo(x, y);

        let html = `<h3>Тайл [${x}, ${y}]</h3>`;
        if (building) {
            html += `<p><strong>${building.variant}</strong> (${building.type})</p>`;
            html += `<p>Клиенты: ${building.connectedClients}/${building.maxClients}</p>`;
            html += `<p>Подключено: ${building.connected ? '✅' : '❌'}</p>`;
            if (building.connected) html += `<p>Скорость: ${building.connectionSpeed} Мбит</p>`;
        }
        if (infra.towers.length) html += `<p>Вышка: Lv${infra.towers[0].level} | HP: ${Math.round(infra.towers[0].health)}%</p>`;
        if (infra.nodes.length) html += `<p>Узел: Lv${infra.nodes[0].level}</p>`;
        html += `<button class="btn btn-secondary" style="margin-top:12px" onclick="UI.closeModal()">Закрыть</button>`;
        this.showModal(html);
    },


    // ==========================================
    // УВЕДОМЛЕНИЯ
    // ==========================================
    notify(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;

        const div = document.createElement('div');
        div.className = `notification ${type}`;
        div.innerHTML = `<span>${message}</span>`;
        container.appendChild(div);

        // Удаляем через 4 секунды
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateX(-20px)';
            setTimeout(() => div.remove(), 300);
        }, 4000);

        // Макс 5 уведомлений
        while (container.children.length > 5) {
            container.firstChild.remove();
        }
    },

    // ==========================================
    // СОВЕТНИК
    // ==========================================
    showAdvisor(message) {
        const advisor = document.getElementById('advisor');
        const text = document.getElementById('advisorText');
        if (!advisor || !text) return;

        text.textContent = message;
        advisor.classList.remove('advisor-hidden');
    },

    dismissAdvisor() {
        const advisor = document.getElementById('advisor');
        if (advisor) advisor.classList.add('advisor-hidden');
    },
};
