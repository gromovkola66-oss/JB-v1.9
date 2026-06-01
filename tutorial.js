// ==========================================
// TUTORIAL.JS — Пошаговое обучение
// ==========================================

const Tutorial = {
    active: false,
    step: 0,
    completed: false,

    STEPS: [
        {
            id: 'welcome',
            title: '👋 Добро пожаловать!',
            text: 'Вы — основатель интернет-провайдера. Ваша цель — подключить весь город к сети и построить телеком-империю.',
            action: null,
            highlight: null,
            waitFor: 'click',
        },
        {
            id: 'look_around',
            title: '🗺️ Осмотритесь',
            text: 'Перемещайте камеру клавишами WASD или зажав Alt+ЛКМ. Приближайте колёсиком мыши. Видите дома? Им нужен интернет!',
            action: null,
            highlight: null,
            waitFor: 'click',
        },
        {
            id: 'select_cable',
            title: '🔌 Проложите кабель',
            text: 'Нажмите на инструмент "Кабель" в панели слева (или он уже выделен). Это основа вашей сети!',
            action: () => { UI.selectTool('cable'); },
            highlight: '[data-tool="cable"]',
            waitFor: 'tool_cable',
        },
        {
            id: 'place_cable',
            title: '🔌 Прокладка кабеля',
            text: 'Кликните на дорогу рядом с вашим узлом, затем кликните на дорогу рядом с домом. Кабель проложится автоматически!',
            action: null,
            highlight: null,
            waitFor: 'cable_placed',
        },
        {
            id: 'place_node',
            title: '🖥️ Установите узел',
            text: 'Узел связи — это мозг вашей сети. Выберите инструмент "Узел" и поставьте его рядом с кабелем.',
            action: null,
            highlight: '[data-tool="node"]',
            waitFor: 'node_placed',
        },
        {
            id: 'wait_clients',
            title: '👥 Ждём клиентов',
            text: 'Отлично! Теперь здания рядом с кабелем подключены. Скоро появятся первые клиенты. Следите за иконкой 👥 вверху.',
            action: null,
            highlight: null,
            waitFor: 'first_client',
        },
        {
            id: 'check_tariffs',
            title: '💰 Проверьте тарифы',
            text: 'Откройте вкладку "Тарифы" внизу. Здесь вы можете создавать и изменять тарифные планы для клиентов.',
            action: null,
            highlight: '[data-tab="tariffs"]',
            waitFor: 'tab_tariffs',
        },
        {
            id: 'check_finance',
            title: '📊 Финансы',
            text: 'Во вкладке "Финансы" — ваш баланс, доходы и расходы. Следите за прибылью!',
            action: null,
            highlight: '[data-tab="finance"]',
            waitFor: 'tab_finance',
        },
        {
            id: 'speed_up',
            title: '⏩ Ускорьте время',
            text: 'Нажмите кнопку ▶▶ или ▶▶▶ вверху справа (или клавиши 2, 3) чтобы ускорить игру.',
            action: null,
            highlight: null,
            waitFor: 'speed_changed',
        },
        {
            id: 'done',
            title: '🎉 Вы готовы!',
            text: 'Основы освоены! Расширяйте сеть, нанимайте персонал, исследуйте технологии и побеждайте конкурентов. Удачи!',
            action: null,
            highlight: null,
            waitFor: 'click',
        },
    ],

    // ==========================================
    // УПРАВЛЕНИЕ
    // ==========================================
    start() {
        // Проверяем не проходил ли уже
        if (localStorage.getItem('ipt_tutorial_done')) {
            this.completed = true;
            return;
        }
        this.active = true;
        this.step = 0;
        this.completed = false;
        setTimeout(() => this.showStep(), 1500);
    },

    showStep() {
        if (!this.active || this.step >= this.STEPS.length) {
            this.finish();
            return;
        }

        const step = this.STEPS[this.step];

        // Выполняем действие если есть
        if (step.action) step.action();

        // Подсвечиваем элемент
        this.clearHighlight();
        if (step.highlight) {
            const el = document.querySelector(step.highlight);
            if (el) {
                el.classList.add('tutorial-highlight');
            }
        }

        // Показываем сообщение
        this.showMessage(step.title, step.text, step.waitFor === 'click');
    },

    showMessage(title, text, showButton) {
        let overlay = document.getElementById('tutorialOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'tutorialOverlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="tutorial-box">
                <div class="tutorial-step-indicator">Шаг ${this.step + 1} из ${this.STEPS.length}</div>
                <h3>${title}</h3>
                <p>${text}</p>
                <div class="tutorial-actions">
                    ${showButton ? '<button class="btn btn-primary btn-small" onclick="Tutorial.nextStep()">Далее</button>' : '<span class="tutorial-hint">Выполните действие...</span>'}
                    <button class="btn btn-secondary btn-small" onclick="Tutorial.skip()" style="margin-left:8px">Пропустить</button>
                </div>
            </div>
        `;
        overlay.style.display = 'block';
    },

    nextStep() {
        this.step++;
        if (this.step >= this.STEPS.length) {
            this.finish();
        } else {
            this.showStep();
        }
    },

    // Вызывается из других систем когда событие произошло
    trigger(eventId) {
        if (!this.active) return;
        const step = this.STEPS[this.step];
        if (!step) return;

        if (step.waitFor === eventId) {
            setTimeout(() => this.nextStep(), 500);
        }
    },

    skip() {
        this.finish();
    },

    finish() {
        this.active = false;
        this.completed = true;
        this.clearHighlight();
        localStorage.setItem('ipt_tutorial_done', '1');

        const overlay = document.getElementById('tutorialOverlay');
        if (overlay) overlay.style.display = 'none';
    },

    clearHighlight() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    },

    // Сброс (для повторного прохождения)
    reset() {
        localStorage.removeItem('ipt_tutorial_done');
        this.active = false;
        this.step = 0;
        this.completed = false;
    },
};
