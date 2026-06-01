// ==========================================
// RENDER.JS — Система рендеринга
// Отрисовка карты, зданий, инфраструктуры, эффекты
// ==========================================

const Renderer = {
    canvas: null,
    ctx: null,
    minimapCanvas: null,
    minimapCtx: null,
    time: 0,
    particles: [],

    // Цвета тайлов
    TILE_COLORS: {
        0: '#1a1a2e', // EMPTY
        1: '#2d4a2d', // GRASS
        2: '#3a3a4a', // ROAD
        3: '#4a6fa5', // RESIDENTIAL
        4: '#6a9f4a', // COMMERCIAL
        5: '#9f7a4a', // INDUSTRIAL
        6: '#7a4a9f', // GOVERNMENT
        7: '#3a6a3a', // PARK
        8: '#2a4a6a', // WATER
        9: '#1a3a1a', // TREE
        10: '#0d0d1a', // LOCKED
    },

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.particles = [];
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },


    // ==========================================
    // ГЛАВНЫЙ РЕНДЕР
    // ==========================================
    render() {
        if (!this.ctx) return;
        this.time += 0.016;

        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Очистка
        ctx.fillStyle = '#0d1520';
        ctx.fillRect(0, 0, W, H);

        // Обновляем камеру
        MapSystem.updateCamera();

        // Сохраняем контекст для трансформации камеры
        ctx.save();
        const cam = MapSystem.camera;
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);

        // Рисуем только видимые тайлы
        this.renderTiles(ctx);
        this.renderBuildings(ctx);
        this.renderCars(ctx);
        this.renderInfrastructure(ctx);
        this.renderHighlights(ctx);
        this.renderParticles(ctx);

        ctx.restore();

        // Overlay эффекты (не зависят от камеры)
        this.renderSeasonOverlay(ctx, W, H);
        this.renderDayNightOverlay(ctx, W, H);
        this.renderWeather(ctx, W, H);

        // Миникарта
        this.renderMinimap();
    },


    // ==========================================
    // ТАЙЛЫ
    // ==========================================
    renderTiles(ctx) {
        const cam = MapSystem.camera;
        const ts = MapSystem.tileSize;

        // Вычисляем видимую область
        const startX = Math.max(0, Math.floor(cam.x / ts) - 1);
        const startY = Math.max(0, Math.floor(cam.y / ts) - 1);
        const endX = Math.min(MapSystem.gridWidth, Math.ceil((cam.x + this.canvas.width / cam.zoom) / ts) + 1);
        const endY = Math.min(MapSystem.gridHeight, Math.ceil((cam.y + this.canvas.height / cam.zoom) / ts) + 1);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = MapSystem.tiles[y]?.[x];
                if (!tile) continue;

                const px = x * ts;
                const py = y * ts;

                // Основной цвет
                ctx.fillStyle = this.TILE_COLORS[tile.type] || '#1a1a2e';
                ctx.fillRect(px, py, ts, ts);

                // Детали по типу
                this.renderTileDetail(ctx, tile, px, py, ts, x, y);
            }
        }

        // Сетка (только при зуме > 1)
        if (cam.zoom > 1.2) {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            for (let y = startY; y <= endY; y++) {
                ctx.beginPath();
                ctx.moveTo(startX * ts, y * ts);
                ctx.lineTo(endX * ts, y * ts);
                ctx.stroke();
            }
            for (let x = startX; x <= endX; x++) {
                ctx.beginPath();
                ctx.moveTo(x * ts, startY * ts);
                ctx.lineTo(x * ts, endY * ts);
                ctx.stroke();
            }
        }
    },

    renderTileDetail(ctx, tile, px, py, ts, tx, ty) {
        const T = MapSystem.TILE_TYPES;

        switch (tile.type) {
            case T.GRASS:
                // Травинки
                if ((tx + ty) % 3 === 0) {
                    ctx.fillStyle = 'rgba(50, 100, 50, 0.4)';
                    ctx.fillRect(px + ts * 0.3, py + ts * 0.6, 1, 4);
                    ctx.fillRect(px + ts * 0.7, py + ts * 0.4, 1, 3);
                }
                break;

            case T.ROAD:
                // Дорожная разметка
                ctx.fillStyle = '#4a4a5a';
                ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
                // Линия по центру
                if (ty % 2 === 0) {
                    ctx.fillStyle = 'rgba(200, 200, 100, 0.3)';
                    ctx.fillRect(px + ts / 2 - 0.5, py + 2, 1, ts - 4);
                }
                break;

            case T.TREE:
                // Ствол
                ctx.fillStyle = '#5a3a1a';
                ctx.fillRect(px + ts * 0.4, py + ts * 0.5, ts * 0.2, ts * 0.4);
                // Крона
                ctx.beginPath();
                ctx.arc(px + ts * 0.5, py + ts * 0.35, ts * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = '#2a6a2a';
                ctx.fill();
                // Блики
                ctx.beginPath();
                ctx.arc(px + ts * 0.4, py + ts * 0.3, ts * 0.12, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(60, 140, 60, 0.5)';
                ctx.fill();
                break;

            case T.PARK:
                ctx.fillStyle = '#2a5a2a';
                ctx.fillRect(px, py, ts, ts);
                // Цветы
                const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(px + 8 + i * 9, py + 12 + (i % 2) * 8, 2, 0, Math.PI * 2);
                    ctx.fillStyle = colors[(tx + ty + i) % colors.length];
                    ctx.fill();
                }
                break;

            case T.WATER:
                // Волны
                const wave = Math.sin(this.time * 2 + tx * 0.5) * 2;
                ctx.fillStyle = '#1a3a5a';
                ctx.fillRect(px, py, ts, ts);
                ctx.strokeStyle = 'rgba(100, 180, 220, 0.2)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(px, py + ts * 0.5 + wave);
                ctx.lineTo(px + ts, py + ts * 0.5 - wave);
                ctx.stroke();
                break;

            case T.LOCKED:
                // Затенённая зона
                ctx.fillStyle = '#08080f';
                ctx.fillRect(px, py, ts, ts);
                if ((tx + ty) % 4 === 0) {
                    ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
                    ctx.fillRect(px + 4, py + 4, 2, 2);
                }
                break;
        }
    },


    // ==========================================
    // ЗДАНИЯ
    // ==========================================
    renderBuildings(ctx) {
        const cam = MapSystem.camera;
        const ts = MapSystem.tileSize;

        for (const building of MapSystem.buildings) {
            const px = building.x * ts;
            const py = building.y * ts;

            // Проверяем видимость
            if (px + ts < cam.x || px > cam.x + this.canvas.width / cam.zoom) continue;
            if (py + ts < cam.y || py > cam.y + this.canvas.height / cam.zoom) continue;

            this.renderBuilding(ctx, building, px, py, ts);
        }
    },

    renderBuilding(ctx, building, px, py, ts) {
        const cam = MapSystem.camera;
        const zoom = cam.zoom;
        const lit = building.connected && building.connectedClients > 0;

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px + 3, py + 3, ts - 2, ts - 2);

        // Вызываем специализированную отрисовку по варианту
        switch (building.variant) {
            case 'apartment': this.drawApartment(ctx, building, px, py, ts, lit); break;
            case 'house_small': this.drawSmallHouse(ctx, building, px, py, ts, lit); break;
            case 'house_medium': this.drawMediumHouse(ctx, building, px, py, ts, lit); break;
            case 'house_large': this.drawLargeHouse(ctx, building, px, py, ts, lit); break;
            case 'office': this.drawOffice(ctx, building, px, py, ts, lit); break;
            case 'shop': this.drawShop(ctx, building, px, py, ts, lit); break;
            case 'cafe': this.drawCafe(ctx, building, px, py, ts, lit); break;
            case 'bank': this.drawBank(ctx, building, px, py, ts, lit); break;
            case 'factory': this.drawFactory(ctx, building, px, py, ts, lit); break;
            case 'warehouse': this.drawWarehouse(ctx, building, px, py, ts, lit); break;
            case 'workshop': this.drawWorkshop(ctx, building, px, py, ts, lit); break;
            case 'school': this.drawSchool(ctx, building, px, py, ts, lit); break;
            case 'hospital': this.drawHospital(ctx, building, px, py, ts, lit); break;
            case 'admin': this.drawAdmin(ctx, building, px, py, ts, lit); break;
            default: this.drawGenericBuilding(ctx, building, px, py, ts, lit); break;
        }

        // Индикатор подключения
        if (building.connected && zoom > 0.5) {
            ctx.beginPath();
            ctx.arc(px + ts - 4, py + 4, 3, 0, Math.PI * 2);
            ctx.fillStyle = lit ? '#4caf50' : '#ff9800';
            ctx.fill();
            if (lit) {
                ctx.beginPath();
                ctx.arc(px + ts - 4, py + 4, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
                ctx.fill();
            }
        }

        // Индикатор спроса
        if (!building.connected && building.demandLevel > 0.5 && zoom > 0.6) {
            const pulse = Math.sin(this.time * 4 + building.id) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.arc(px + ts / 2, py - 4, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 50, ${pulse})`;
            ctx.fill();
        }
    },

    // --- ЖИЛЫЕ ---
    drawApartment(ctx, b, px, py, ts, lit) {
        // Многоэтажка
        const bh = ts * 0.85;
        ctx.fillStyle = '#3a5580';
        ctx.fillRect(px + 3, py + ts - bh, ts - 6, bh - 2);
        // Этажные полоски
        ctx.fillStyle = '#2d4570';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(px + 3, py + ts - bh + i * (bh / 4), ts - 6, 1);
        }
        // Крыша
        ctx.fillStyle = '#4a6590';
        ctx.fillRect(px + 2, py + ts - bh - 2, ts - 4, 3);
        // Антенна на крыше
        ctx.fillStyle = '#778';
        ctx.fillRect(px + ts / 2 - 1, py + ts - bh - 7, 2, 6);
        // Окна (3 колонки)
        this.drawWindowGrid(ctx, b, px + 6, py + ts - bh + 4, 3, 4, 6, (bh - 8) / 4, lit);
    },

    drawSmallHouse(ctx, b, px, py, ts, lit) {
        // Маленький домик с треугольной крышей
        const bh = ts * 0.5;
        const baseY = py + ts - bh;
        // Стены
        ctx.fillStyle = '#c4a882';
        ctx.fillRect(px + 5, baseY, ts - 10, bh - 2);
        // Крыша треугольная
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.moveTo(px + 3, baseY);
        ctx.lineTo(px + ts / 2, baseY - 8);
        ctx.lineTo(px + ts - 3, baseY);
        ctx.closePath();
        ctx.fill();
        // Дверь
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(px + ts / 2 - 3, baseY + bh - 10, 6, 8);
        // Окно
        const wc = lit ? `rgba(255, 230, 130, ${0.7 + Math.sin(this.time * 2 + b.id) * 0.2})` : 'rgba(40, 60, 100, 0.5)';
        ctx.fillStyle = wc;
        ctx.fillRect(px + 8, baseY + 4, 5, 5);
        ctx.fillRect(px + ts - 13, baseY + 4, 5, 5);
    },

    drawMediumHouse(ctx, b, px, py, ts, lit) {
        // Двухэтажный дом
        const bh = ts * 0.65;
        const baseY = py + ts - bh;
        ctx.fillStyle = '#a0b8c8';
        ctx.fillRect(px + 4, baseY, ts - 8, bh - 2);
        // Крыша плоская с карнизом
        ctx.fillStyle = '#556b7a';
        ctx.fillRect(px + 2, baseY - 3, ts - 4, 4);
        // Балкон второго этажа
        ctx.fillStyle = '#8a9fad';
        ctx.fillRect(px + 6, baseY + 3, ts - 12, 2);
        // Окна (2 этажа)
        this.drawWindowGrid(ctx, b, px + 7, baseY + 5, 2, 2, 8, (bh - 12) / 2, lit);
        // Дверь
        ctx.fillStyle = '#3a5060';
        ctx.fillRect(px + ts / 2 - 3, baseY + bh - 10, 6, 8);
    },

    drawLargeHouse(ctx, b, px, py, ts, lit) {
        // Большой коттедж
        const bh = ts * 0.7;
        const baseY = py + ts - bh;
        // Основной корпус
        ctx.fillStyle = '#e8dcc8';
        ctx.fillRect(px + 3, baseY, ts - 6, bh - 2);
        // Гараж сбоку
        ctx.fillStyle = '#d0c4b0';
        ctx.fillRect(px + ts - 12, baseY + bh * 0.4, 10, bh * 0.6 - 2);
        // Крыша
        ctx.fillStyle = '#6b3a2a';
        ctx.beginPath();
        ctx.moveTo(px + 1, baseY);
        ctx.lineTo(px + ts * 0.6, baseY - 10);
        ctx.lineTo(px + ts - 1, baseY);
        ctx.closePath();
        ctx.fill();
        // Окна
        this.drawWindowGrid(ctx, b, px + 6, baseY + 5, 3, 2, 7, (bh - 14) / 2, lit);
        // Дымоход
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(px + ts * 0.7, baseY - 12, 4, 8);
    },

    // --- КОММЕРЧЕСКИЕ ---
    drawOffice(ctx, b, px, py, ts, lit) {
        // Офисное здание со стеклянным фасадом
        const bh = ts * 0.8;
        const baseY = py + ts - bh;
        // Каркас
        ctx.fillStyle = '#2a3a4a';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 1);
        // Стеклянные панели
        const glassColor = lit ? 'rgba(100, 200, 255, 0.4)' : 'rgba(40, 80, 120, 0.6)';
        ctx.fillStyle = glassColor;
        ctx.fillRect(px + 4, baseY + 2, ts - 8, bh - 5);
        // Горизонтальные перекрытия
        ctx.fillStyle = '#3a4a5a';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(px + 2, baseY + i * (bh / 3), ts - 4, 2);
        }
        // Вход
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(px + ts / 2 - 5, baseY + bh - 8, 10, 7);
        // Блики на стекле
        if (lit) {
            ctx.fillStyle = `rgba(150, 220, 255, ${0.1 + Math.sin(this.time + b.id) * 0.05})`;
            ctx.fillRect(px + 5, baseY + 3, 4, bh - 8);
        }
    },

    drawShop(ctx, b, px, py, ts, lit) {
        // Магазин с витриной
        const bh = ts * 0.55;
        const baseY = py + ts - bh;
        // Стены
        ctx.fillStyle = '#d4a06a';
        ctx.fillRect(px + 3, baseY, ts - 6, bh - 2);
        // Навес/маркиза
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(px + 2, baseY - 3, ts - 4, 4);
        // Полоски на навесе
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(px + 4 + i * 7, baseY - 3, 3, 4);
        }
        // Витрина
        const vitColor = lit ? 'rgba(255, 240, 180, 0.7)' : 'rgba(60, 90, 120, 0.5)';
        ctx.fillStyle = vitColor;
        ctx.fillRect(px + 5, baseY + 4, ts - 10, bh * 0.5);
        // Дверь
        ctx.fillStyle = '#5a3a2a';
        ctx.fillRect(px + ts / 2 - 3, baseY + bh - 10, 6, 8);
    },

    drawCafe(ctx, b, px, py, ts, lit) {
        // Кафе с верандой
        const bh = ts * 0.5;
        const baseY = py + ts - bh;
        // Стены
        ctx.fillStyle = '#f0e6d0';
        ctx.fillRect(px + 4, baseY, ts - 8, bh - 2);
        // Крыша
        ctx.fillStyle = '#2a8a4a';
        ctx.fillRect(px + 2, baseY - 3, ts - 4, 4);
        // Столики на улице (точки)
        ctx.fillStyle = '#8b7355';
        ctx.beginPath(); ctx.arc(px + 7, py + ts - 3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + ts - 7, py + ts - 3, 2, 0, Math.PI * 2); ctx.fill();
        // Окно
        const wc = lit ? `rgba(255, 220, 100, 0.8)` : 'rgba(50, 70, 90, 0.5)';
        ctx.fillStyle = wc;
        ctx.fillRect(px + 6, baseY + 4, ts - 12, bh * 0.4);
        // Вывеска
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(px + ts / 2 - 4, baseY - 6, 8, 3);
    },

    drawBank(ctx, b, px, py, ts, lit) {
        // Банк — солидное здание с колоннами
        const bh = ts * 0.75;
        const baseY = py + ts - bh;
        // Стены
        ctx.fillStyle = '#e0dcd0';
        ctx.fillRect(px + 3, baseY, ts - 6, bh - 2);
        // Крыша с фронтоном
        ctx.fillStyle = '#8a8070';
        ctx.beginPath();
        ctx.moveTo(px + 2, baseY);
        ctx.lineTo(px + ts / 2, baseY - 6);
        ctx.lineTo(px + ts - 2, baseY);
        ctx.closePath();
        ctx.fill();
        // Колонны
        ctx.fillStyle = '#c8c0b0';
        ctx.fillRect(px + 6, baseY + 3, 2, bh - 6);
        ctx.fillRect(px + ts - 8, baseY + 3, 2, bh - 6);
        ctx.fillRect(px + ts / 2 - 1, baseY + 3, 2, bh - 6);
        // Окна
        this.drawWindowGrid(ctx, b, px + 9, baseY + 6, 2, 2, 7, (bh - 14) / 2, lit);
        // Символ ₽
        if (MapSystem.camera.zoom > 1) {
            ctx.font = '7px sans-serif';
            ctx.fillStyle = '#8a7a5a';
            ctx.fillText('₽', px + ts / 2 - 3, baseY - 1);
        }
    },

    // --- ПРОМЫШЛЕННЫЕ ---
    drawFactory(ctx, b, px, py, ts, lit) {
        // Завод с трубами
        const bh = ts * 0.6;
        const baseY = py + ts - bh;
        // Корпус
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 2);
        // Крыша-зигзаг
        ctx.fillStyle = '#4a4a5a';
        ctx.beginPath();
        ctx.moveTo(px + 2, baseY);
        ctx.lineTo(px + ts * 0.33, baseY - 6);
        ctx.lineTo(px + ts * 0.5, baseY);
        ctx.lineTo(px + ts * 0.75, baseY - 6);
        ctx.lineTo(px + ts - 2, baseY);
        ctx.closePath();
        ctx.fill();
        // Труба с дымом
        ctx.fillStyle = '#7a7a8a';
        ctx.fillRect(px + ts - 10, baseY - 12, 5, 14);
        // Дым (анимированный)
        const smokeAlpha = 0.2 + Math.sin(this.time * 2 + b.id) * 0.1;
        ctx.fillStyle = `rgba(150, 150, 160, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(px + ts - 8 + Math.sin(this.time + b.id) * 2, baseY - 16, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + ts - 6 + Math.sin(this.time * 0.7 + b.id) * 3, baseY - 22, 3, 0, Math.PI * 2);
        ctx.fill();
        // Ворота
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(px + 5, baseY + bh - 10, 10, 8);
    },

    drawWarehouse(ctx, b, px, py, ts, lit) {
        // Склад — длинное здание
        const bh = ts * 0.5;
        const baseY = py + ts - bh;
        // Стены
        ctx.fillStyle = '#7a8a7a';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 2);
        // Крыша полукруглая
        ctx.fillStyle = '#6a7a6a';
        ctx.beginPath();
        ctx.ellipse(px + ts / 2, baseY, (ts - 4) / 2, 5, 0, Math.PI, 0);
        ctx.fill();
        // Ворота-роллеты
        ctx.fillStyle = '#4a5a4a';
        ctx.fillRect(px + 5, baseY + 4, ts * 0.35, bh - 8);
        ctx.fillRect(px + ts * 0.55, baseY + 4, ts * 0.35, bh - 8);
        // Полоски роллет
        ctx.strokeStyle = '#5a6a5a';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            const gy = baseY + 6 + i * 4;
            ctx.beginPath(); ctx.moveTo(px + 5, gy); ctx.lineTo(px + 5 + ts * 0.35, gy); ctx.stroke();
        }
    },

    drawWorkshop(ctx, b, px, py, ts, lit) {
        // Мастерская
        const bh = ts * 0.55;
        const baseY = py + ts - bh;
        ctx.fillStyle = '#8a7060';
        ctx.fillRect(px + 3, baseY, ts - 6, bh - 2);
        // Крыша
        ctx.fillStyle = '#6a5040';
        ctx.fillRect(px + 1, baseY - 2, ts - 2, 3);
        // Окно
        const wc = lit ? 'rgba(255, 200, 100, 0.7)' : 'rgba(40, 50, 60, 0.5)';
        ctx.fillStyle = wc;
        ctx.fillRect(px + 6, baseY + 4, ts - 12, 6);
        // Дверь
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(px + ts / 2 - 4, baseY + bh - 10, 8, 8);
        // Вывеска-инструмент
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(px + ts / 2 - 2, baseY - 5, 4, 3);
    },

    // --- ГОСУДАРСТВЕННЫЕ ---
    drawSchool(ctx, b, px, py, ts, lit) {
        const bh = ts * 0.7;
        const baseY = py + ts - bh;
        // Здание
        ctx.fillStyle = '#b8a890';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 2);
        // Крыша
        ctx.fillStyle = '#7a6a5a';
        ctx.fillRect(px + 1, baseY - 2, ts - 2, 3);
        // Окна в ряд (много!)
        this.drawWindowGrid(ctx, b, px + 5, baseY + 5, 4, 2, 6, (bh - 12) / 2, lit);
        // Флагшток
        ctx.fillStyle = '#888';
        ctx.fillRect(px + ts - 6, baseY - 10, 1, 12);
        // Флаг
        ctx.fillStyle = '#3366cc';
        ctx.fillRect(px + ts - 5, baseY - 10, 5, 3);
        // Двор/площадка
        ctx.fillStyle = '#8a9070';
        ctx.fillRect(px + 5, py + ts - 4, ts - 10, 3);
    },

    drawHospital(ctx, b, px, py, ts, lit) {
        const bh = ts * 0.8;
        const baseY = py + ts - bh;
        // Здание
        ctx.fillStyle = '#e8e8f0';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 2);
        // Крест
        ctx.fillStyle = '#dd3333';
        ctx.fillRect(px + ts / 2 - 3, baseY + 3, 6, 2);
        ctx.fillRect(px + ts / 2 - 1, baseY + 1, 2, 6);
        // Окна
        this.drawWindowGrid(ctx, b, px + 5, baseY + 10, 3, 3, 6, (bh - 16) / 3, lit);
        // Вход с козырьком
        ctx.fillStyle = '#ccc';
        ctx.fillRect(px + ts / 2 - 6, baseY + bh - 10, 12, 2);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(px + ts / 2 - 4, baseY + bh - 8, 8, 6);
    },

    drawAdmin(ctx, b, px, py, ts, lit) {
        const bh = ts * 0.75;
        const baseY = py + ts - bh;
        // Солидное здание
        ctx.fillStyle = '#d0c8b8';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 2);
        // Карниз
        ctx.fillStyle = '#a09888';
        ctx.fillRect(px + 1, baseY - 2, ts - 2, 3);
        ctx.fillRect(px + 1, baseY + bh * 0.5, ts - 2, 2);
        // Колонны
        ctx.fillStyle = '#b8b0a0';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(px + 6 + i * 9, baseY + 3, 2, bh - 6);
        }
        // Окна
        this.drawWindowGrid(ctx, b, px + 9, baseY + 6, 2, 2, 8, (bh - 14) / 2, lit);
        // Флаг
        ctx.fillStyle = '#888';
        ctx.fillRect(px + 5, baseY - 8, 1, 10);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(px + 6, baseY - 8, 5, 3);
    },

    // --- GENERIC ---
    drawGenericBuilding(ctx, b, px, py, ts, lit) {
        const bh = ts * (b.height || 0.6);
        const baseY = py + ts - bh;
        ctx.fillStyle = b.color || '#4a6fa5';
        ctx.fillRect(px + 2, baseY, ts - 4, bh - 2);
        ctx.fillStyle = this.darkenColor(b.color || '#4a6fa5', 0.3);
        ctx.fillRect(px + 1, baseY - 2, ts - 2, 3);
        this.drawWindowGrid(ctx, b, px + 5, baseY + 4, 3, 2, 7, (bh - 10) / 2, lit);
    },

    // --- УТИЛИТА: СЕТКА ОКОН ---
    drawWindowGrid(ctx, b, startX, startY, cols, rows, spacingX, spacingY, lit) {
        for (let wy = 0; wy < rows; wy++) {
            for (let wx = 0; wx < cols; wx++) {
                const winX = startX + wx * spacingX;
                const winY = startY + wy * spacingY;
                let windowColor;
                if (lit) {
                    const on = Math.sin(this.time * 2 + wx * 3.7 + wy * 5.1 + b.id * 1.3) > -0.3;
                    if (on) {
                        const warm = Math.sin(this.time * 1.5 + wx + wy + b.id) * 0.15;
                        windowColor = `rgba(255, 235, 140, ${0.6 + warm})`;
                    } else {
                        windowColor = 'rgba(30, 50, 80, 0.5)';
                    }
                } else {
                    windowColor = 'rgba(30, 50, 80, 0.5)';
                }
                ctx.fillStyle = windowColor;
                ctx.fillRect(winX, winY, 4, 4);
            }
        }
    },


    // ==========================================
    // ИНФРАСТРУКТУРА
    // ==========================================
    renderInfrastructure(ctx) {
        this.renderCables(ctx);
        this.renderTowers(ctx);
        this.renderNodes(ctx);
        this.renderDatacenters(ctx);
    },

    renderCables(ctx) {
        const ts = MapSystem.tileSize;

        for (const cable of Infrastructure.cables) {
            if (!cable.active) continue;
            const type = Infrastructure.CABLE_TYPES[cable.type];
            if (!type) continue;

            // Цвет кабеля
            ctx.strokeStyle = cable.active ? type.color : 'rgba(100,50,50,0.5)';
            ctx.lineWidth = cable.active ? 2 : 1;
            ctx.lineCap = 'round';

            // Рисуем путь
            ctx.beginPath();
            for (let i = 0; i < cable.path.length; i++) {
                const p = cable.path[i];
                const x = p.x * ts + ts / 2;
                const y = p.y * ts + ts / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Анимация пакетов данных (если активен и есть клиенты)
            if (cable.active && cable.currentClients > 0 && MapSystem.camera.zoom > 0.6) {
                this.renderDataPackets(ctx, cable, ts);
            }
        }

        // Рисуем текущую прокладку кабеля
        if (Infrastructure.cableDrawing && Infrastructure.cablePath.length > 0) {
            ctx.strokeStyle = 'rgba(0, 188, 212, 0.7)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            for (let i = 0; i < Infrastructure.cablePath.length; i++) {
                const p = Infrastructure.cablePath[i];
                const x = p.x * ts + ts / 2;
                const y = p.y * ts + ts / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    renderDataPackets(ctx, cable, ts) {
        // Маленькие точки бегут по кабелю
        const numPackets = Math.min(5, Math.ceil(cable.currentClients / 5));
        for (let i = 0; i < numPackets; i++) {
            const progress = ((this.time * 2 + i * 0.3) % 1);
            const pathIdx = Math.floor(progress * (cable.path.length - 1));
            const nextIdx = Math.min(pathIdx + 1, cable.path.length - 1);
            const localProgress = (progress * (cable.path.length - 1)) - pathIdx;

            const p1 = cable.path[pathIdx];
            const p2 = cable.path[nextIdx];
            if (!p1 || !p2) continue;

            const x = (p1.x + (p2.x - p1.x) * localProgress) * ts + ts / 2;
            const y = (p1.y + (p2.y - p1.y) * localProgress) * ts + ts / 2;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 255, 200, 0.8)';
            ctx.fill();
        }
    },

    renderTowers(ctx) {
        const ts = MapSystem.tileSize;

        for (const tower of Infrastructure.towers) {
            if (!tower.active) continue;
            const px = tower.x * ts;
            const py = tower.y * ts;

            // Зона покрытия
            const radius = tower.radius * ts;
            ctx.beginPath();
            ctx.arc(px + ts / 2, py + ts / 2, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 188, 212, 0.04)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 188, 212, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Анимированные волны сигнала
            const wave1 = (this.time * 0.5) % 1;
            const wave2 = (this.time * 0.5 + 0.5) % 1;
            for (const w of [wave1, wave2]) {
                ctx.beginPath();
                ctx.arc(px + ts / 2, py + ts / 2, radius * w, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 188, 212, ${0.2 * (1 - w)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // База вышки (платформа)
            ctx.fillStyle = '#3a4a5a';
            ctx.fillRect(px + ts * 0.25, py + ts * 0.82, ts * 0.5, ts * 0.12);

            // Столб вышки
            ctx.fillStyle = '#667788';
            ctx.fillRect(px + ts * 0.46, py + ts * 0.15, ts * 0.08, ts * 0.67);

            // Поперечные балки
            ctx.strokeStyle = '#556677';
            ctx.lineWidth = 1;
            for (let b = 0; b < 3; b++) {
                const by = py + ts * 0.3 + b * ts * 0.18;
                ctx.beginPath();
                ctx.moveTo(px + ts * 0.35, by);
                ctx.lineTo(px + ts * 0.65, by);
                ctx.stroke();
            }

            // Антенна сверху
            ctx.fillStyle = '#aabbcc';
            ctx.fillRect(px + ts * 0.42, py + ts * 0.08, ts * 0.16, ts * 0.05);
            ctx.fillRect(px + ts * 0.48, py + ts * 0.03, ts * 0.04, ts * 0.1);

            // Мигающий красный индикатор наверху
            const blink = Math.sin(this.time * 5 + tower.id * 2) > 0;
            ctx.beginPath();
            ctx.arc(px + ts * 0.5, py + ts * 0.05, 2, 0, Math.PI * 2);
            ctx.fillStyle = blink ? '#ff3333' : '#440000';
            ctx.fill();
            // Свечение индикатора
            if (blink) {
                ctx.beginPath();
                ctx.arc(px + ts * 0.5, py + ts * 0.05, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
                ctx.fill();
            }
        }
    },


    renderNodes(ctx) {
        const ts = MapSystem.tileSize;

        for (const node of Infrastructure.nodes) {
            if (!node.active) continue;
            const px = node.x * ts;
            const py = node.y * ts;

            // Корпус
            ctx.fillStyle = '#2a3a5a';
            ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
            ctx.strokeStyle = '#4a6a8a';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);

            // Серверные стойки (маленькие линии)
            ctx.fillStyle = '#1a2a3a';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(px + 5 + i * 8, py + 6, 5, ts - 12);
            }

            // Мигающие LED
            for (let i = 0; i < 4; i++) {
                const led = Math.sin(this.time * 8 + i * 1.5) > 0;
                ctx.beginPath();
                ctx.arc(px + 7 + i * 7, py + ts - 5, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = led ? '#00ff88' : '#003322';
                ctx.fill();
            }

            // Уровень
            if (node.level > 1) {
                ctx.font = '8px sans-serif';
                ctx.fillStyle = '#00bcd4';
                ctx.fillText(`Lv${node.level}`, px + 3, py + ts - 1);
            }
        }
    },

    renderDatacenters(ctx) {
        const ts = MapSystem.tileSize;

        for (const dc of Infrastructure.datacenters) {
            if (!dc.active) continue;
            const px = dc.x * ts;
            const py = dc.y * ts;

            // Большое здание
            ctx.fillStyle = '#1a2a4a';
            ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
            ctx.strokeStyle = '#3a5a8a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);

            // Вентиляторы на крыше
            const fanAngle = this.time * 10;
            ctx.save();
            ctx.translate(px + ts * 0.3, py + ts * 0.3);
            ctx.rotate(fanAngle);
            ctx.fillStyle = '#5a7a9a';
            ctx.fillRect(-3, -1, 6, 2);
            ctx.fillRect(-1, -3, 2, 6);
            ctx.restore();

            ctx.save();
            ctx.translate(px + ts * 0.7, py + ts * 0.3);
            ctx.rotate(-fanAngle);
            ctx.fillStyle = '#5a7a9a';
            ctx.fillRect(-3, -1, 6, 2);
            ctx.fillRect(-1, -3, 2, 6);
            ctx.restore();

            // Свечение
            const glow = ctx.createRadialGradient(px + ts / 2, py + ts / 2, 0, px + ts / 2, py + ts / 2, ts);
            glow.addColorStop(0, 'rgba(0, 100, 200, 0.1)');
            glow.addColorStop(1, 'rgba(0, 100, 200, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(px - ts * 0.5, py - ts * 0.5, ts * 2, ts * 2);
        }
    },


    // ==========================================
    // ПОДСВЕТКИ И ОВЕРЛЕИ
    // ==========================================
    renderHighlights(ctx) {
        const ts = MapSystem.tileSize;
        const hovered = MapSystem.hoveredTile;

        // Подсветка наведённого тайла
        if (hovered && MapSystem.isValidPosition(hovered.x, hovered.y)) {
            const px = hovered.x * ts;
            const py = hovered.y * ts;
            ctx.strokeStyle = 'rgba(0, 188, 212, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, ts, ts);

            // Подсветка для инструмента вышки — показываем радиус
            if (UI.currentTool === 'tower') {
                const radius = Infrastructure.TOWER_TYPES.wifi.radius * ts;
                ctx.beginPath();
                ctx.arc(px + ts / 2, py + ts / 2, radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 188, 212, 0.2)';
                ctx.fillStyle = 'rgba(0, 188, 212, 0.05)';
                ctx.fill();
                ctx.stroke();
            }
        }

        // Подсветка выбранного тайла
        const selected = MapSystem.selectedTile;
        if (selected && MapSystem.isValidPosition(selected.x, selected.y)) {
            const px = selected.x * ts;
            const py = selected.y * ts;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(px - 1, py - 1, ts + 2, ts + 2);
        }

        // Границы зон
        for (const zone of MapSystem.zones) {
            if (!zone.unlocked) continue;
            const zx = zone.x * ts;
            const zy = zone.y * ts;
            const zw = zone.w * ts;
            const zh = zone.h * ts;
            ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 10]);
            ctx.strokeRect(zx, zy, zw, zh);
            ctx.setLineDash([]);
        }
    },

    // ==========================================
    // ДЕНЬ/НОЧЬ
    // ==========================================
    renderDayNightOverlay(ctx, W, H) {
        const hour = Game.time.hour || 12;
        let alpha = 0;

        if (hour >= 22 || hour < 5) {
            alpha = 0.3; // глубокая ночь
        } else if (hour >= 20) {
            alpha = 0.15 * ((hour - 18) / 4); // поздний вечер
        } else if (hour >= 18) {
            alpha = 0.05 + 0.1 * ((hour - 18) / 2); // вечер
        } else if (hour < 7) {
            alpha = 0.2 * ((7 - hour) / 2); // раннее утро
        } else if (hour < 9) {
            alpha = 0.03 * ((9 - hour) / 2); // утро рассеивается
        }

        if (alpha > 0.001) {
            ctx.fillStyle = `rgba(10, 15, 40, ${Math.min(alpha, 0.4)})`;
            ctx.fillRect(0, 0, W, H);
        }
    },

    // ==========================================
    // ПОГОДА
    // ==========================================
    renderWeather(ctx, W, H) {
        // Простой дождь при определённых событиях
        const hasStorm = Events.activeEvents.find(e => e.id === 'storm');
        if (!hasStorm) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(150, 180, 220, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 120; i++) {
            // Более реалистичное распределение капель
            const seed = i * 7.3;
            const x = ((seed * 137.5) % W);
            const speed = 250 + (i % 5) * 60;
            const y = ((this.time * speed + seed * 43) % (H + 20)) - 10;
            const len = 10 + (i % 4) * 4;
            const windOffset = Math.sin(this.time * 0.5) * 3;
            ctx.globalAlpha = 0.15 + (i % 3) * 0.05;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + windOffset - 1, y + len);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },


    // ==========================================
    // ЧАСТИЦЫ
    // ==========================================
    renderParticles(ctx) {
        if (this.particles.length === 0) return;

        ctx.save();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02; // лёгкая гравитация
            p.life -= p.decay;
            p.size *= 0.99; // постепенно уменьшается

            if (p.life <= 0 || p.size < 0.3) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = Math.max(0, p.life);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    spawnParticles(x, y, color, count) {
        const ts = MapSystem.tileSize;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x * ts + ts / 2,
                y: y * ts + ts / 2,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 1 + Math.random() * 2,
                color: color,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
            });
        }
    },

    // ==========================================
    // МИНИКАРТА
    // ==========================================
    renderMinimap() {
        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const W = 180, H = 140;

        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, W, H);

        const scaleX = W / MapSystem.gridWidth;
        const scaleY = H / MapSystem.gridHeight;

        // Тайлы (упрощённо)
        for (let y = 0; y < MapSystem.gridHeight; y += 2) {
            for (let x = 0; x < MapSystem.gridWidth; x += 2) {
                const tile = MapSystem.tiles[y]?.[x];
                if (!tile || tile.type === MapSystem.TILE_TYPES.LOCKED) continue;

                let color = '#1a2a1a';
                if (tile.type === MapSystem.TILE_TYPES.ROAD) color = '#3a3a4a';
                else if (tile.building) color = tile.building.connected ? '#4a8a4a' : '#4a4a6a';
                else if (tile.cable !== null) color = '#3366cc';

                ctx.fillStyle = color;
                ctx.fillRect(x * scaleX, y * scaleY, scaleX * 2, scaleY * 2);
            }
        }

        // Вышки на миникарте
        for (const tower of Infrastructure.towers) {
            if (!tower.active) continue;
            ctx.beginPath();
            ctx.arc(tower.x * scaleX, tower.y * scaleY, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#00bcd4';
            ctx.fill();
        }

        // Рамка камеры
        const cam = MapSystem.camera;
        const camX = cam.x / MapSystem.tileSize * scaleX;
        const camY = cam.y / MapSystem.tileSize * scaleY;
        const camW = (this.canvas.width / cam.zoom) / MapSystem.tileSize * scaleX;
        const camH = (this.canvas.height / cam.zoom) / MapSystem.tileSize * scaleY;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(camX, camY, camW, camH);
    },

    // ==========================================
    // МАШИНКИ НА ДОРОГАХ
    // ==========================================
    cars: [],
    carSpawnTimer: 0,

    renderCars(ctx) {
        const ts = MapSystem.tileSize;
        this.carSpawnTimer += 0.016;

        // Спавним новые машинки
        if (this.carSpawnTimer > 2 && this.cars.length < 15) {
            this.carSpawnTimer = 0;
            this.spawnCar();
        }

        // Обновляем и рисуем
        for (let i = this.cars.length - 1; i >= 0; i--) {
            const car = this.cars[i];
            car.x += car.vx * car.speed;
            car.y += car.vy * car.speed;

            // Удаляем если вышла за карту
            if (car.x < -2 || car.x > MapSystem.gridWidth + 2 ||
                car.y < -2 || car.y > MapSystem.gridHeight + 2) {
                this.cars.splice(i, 1);
                continue;
            }

            const px = car.x * ts;
            const py = car.y * ts;

            // Корпус
            ctx.fillStyle = car.color;
            if (car.vx !== 0) {
                // Горизонтальная
                ctx.fillRect(px - 5, py + ts * 0.35, 10, 5);
                // Окна
                ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
                ctx.fillRect(px - 2, py + ts * 0.35, 3, 4);
                // Фары
                ctx.fillStyle = car.vx > 0 ? 'rgba(255,255,200,0.8)' : 'rgba(255,50,50,0.6)';
                ctx.fillRect(car.vx > 0 ? px + 4 : px - 5, py + ts * 0.37, 2, 2);
            } else {
                // Вертикальная
                ctx.fillRect(px + ts * 0.35, py - 5, 5, 10);
                ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
                ctx.fillRect(px + ts * 0.36, py - 2, 4, 3);
                ctx.fillStyle = car.vy > 0 ? 'rgba(255,255,200,0.8)' : 'rgba(255,50,50,0.6)';
                ctx.fillRect(px + ts * 0.37, car.vy > 0 ? py + 4 : py - 5, 2, 2);
            }
        }
    },

    spawnCar() {
        const roadTiles = [];
        const zones = MapSystem.zones.filter(z => z.unlocked);
        for (const zone of zones) {
            for (let y = zone.y; y < zone.y + zone.h; y++) {
                for (let x = zone.x; x < zone.x + zone.w; x++) {
                    const tile = MapSystem.tiles[y]?.[x];
                    if (tile && tile.road) roadTiles.push({ x, y });
                }
            }
        }

        if (roadTiles.length === 0) return;

        const start = roadTiles[Math.floor(Math.random() * roadTiles.length)];
        const colors = ['#cc3333', '#3366cc', '#33aa33', '#dddd33', '#8833aa', '#ff8833', '#333333', '#eeeeee'];

        // Определяем направление по соседним дорогам
        let vx = 0, vy = 0;
        const up = MapSystem.getTile(start.x, start.y - 1);
        const down = MapSystem.getTile(start.x, start.y + 1);
        const left = MapSystem.getTile(start.x - 1, start.y);
        const right = MapSystem.getTile(start.x + 1, start.y);

        if (left && left.road && right && right.road) {
            vx = Math.random() > 0.5 ? 1 : -1;
        } else if (up && up.road && down && down.road) {
            vy = Math.random() > 0.5 ? 1 : -1;
        } else {
            vx = Math.random() > 0.5 ? 1 : -1;
        }

        this.cars.push({
            x: start.x + 0.5,
            y: start.y + 0.5,
            vx, vy,
            speed: 0.01 + Math.random() * 0.015,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    },

    // ==========================================
    // СЕЗОННЫЙ ОВЕРЛЕЙ
    // ==========================================
    renderSeasonOverlay(ctx, W, H) {
        const month = Game.time.month;
        let season = 'summer';
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'autumn';
        else season = 'winter';

        switch (season) {
            case 'spring':
                // Лёгкий зелёный оттенок
                ctx.fillStyle = 'rgba(50, 180, 80, 0.02)';
                ctx.fillRect(0, 0, W, H);
                break;

            case 'summer':
                // Тёплый оттенок
                ctx.fillStyle = 'rgba(255, 200, 50, 0.015)';
                ctx.fillRect(0, 0, W, H);
                break;

            case 'autumn':
                // Оранжевый оттенок + падающие листья
                ctx.fillStyle = 'rgba(200, 100, 30, 0.025)';
                ctx.fillRect(0, 0, W, H);
                // Листья
                ctx.fillStyle = 'rgba(200, 120, 30, 0.3)';
                for (let i = 0; i < 12; i++) {
                    const lx = ((this.time * 20 + i * 97) % W);
                    const ly = ((this.time * 40 + i * 67) % H);
                    const rot = this.time * 2 + i;
                    ctx.save();
                    ctx.translate(lx, ly);
                    ctx.rotate(rot);
                    ctx.fillRect(-2, -1, 4, 2);
                    ctx.restore();
                }
                break;

            case 'winter':
                // Голубоватый оттенок + снег
                ctx.fillStyle = 'rgba(100, 150, 230, 0.03)';
                ctx.fillRect(0, 0, W, H);
                // Снежинки
                ctx.fillStyle = 'rgba(220, 230, 255, 0.5)';
                for (let i = 0; i < 30; i++) {
                    const sx = ((this.time * 15 + i * 73 + Math.sin(i * 2.3) * 50) % W);
                    const sy = ((this.time * 25 + i * 51) % H);
                    const size = 1 + (i % 3);
                    ctx.beginPath();
                    ctx.arc(sx, sy, size, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    },

    // ==========================================
    // УТИЛИТЫ
    // ==========================================
    darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, ((num >> 16) & 0xff) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0xff) - Math.floor(255 * amount));
        return `rgb(${r},${g},${b})`;
    },
};
