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
        this.renderInfrastructure(ctx);
        this.renderHighlights(ctx);
        this.renderParticles(ctx);

        ctx.restore();

        // Overlay эффекты (не зависят от камеры)
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
        const h = building.height;
        const bh = ts * h; // высота здания визуально

        // Тень
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px + 3, py + 3, ts - 2, ts - 2);

        // Корпус здания
        const baseColor = building.color || '#4a6fa5';
        ctx.fillStyle = baseColor;
        ctx.fillRect(px + 2, py + (ts - bh) * 0.5, ts - 4, bh * 0.9);

        // Крыша
        ctx.fillStyle = this.darkenColor(baseColor, 0.3);
        ctx.fillRect(px + 1, py + (ts - bh) * 0.5 - 2, ts - 2, 3);

        // Окна
        if (cam.zoom > 0.7) {
            const windowRows = Math.max(1, Math.floor(bh / 8));
            const windowCols = Math.max(1, Math.floor((ts - 8) / 7));

            for (let wy = 0; wy < windowRows; wy++) {
                for (let wx = 0; wx < windowCols; wx++) {
                    const winX = px + 5 + wx * 7;
                    const winY = py + (ts - bh) * 0.5 + 4 + wy * 8;

                    // Окна светятся ночью и у подключённых зданий
                    let windowColor;
                    if (building.connected && building.connectedClients > 0) {
                        const flicker = Math.sin(this.time * 3 + wx + wy + building.id) * 0.2;
                        windowColor = `rgba(255, 240, 150, ${0.6 + flicker})`;
                    } else {
                        windowColor = 'rgba(30, 50, 80, 0.6)';
                    }

                    ctx.fillStyle = windowColor;
                    ctx.fillRect(winX, winY, 4, 5);
                }
            }
        }

        // Индикатор подключения
        if (building.connected && MapSystem.camera.zoom > 0.5) {
            ctx.beginPath();
            ctx.arc(px + ts - 5, py + 5, 3, 0, Math.PI * 2);
            ctx.fillStyle = building.connectedClients > 0 ? '#4caf50' : '#ff9800';
            ctx.fill();
        }

        // Индикатор спроса (если не подключено)
        if (!building.connected && building.demandLevel > 0.5 && MapSystem.camera.zoom > 0.6) {
            const pulse = Math.sin(this.time * 4) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.arc(px + ts / 2, py - 3, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 50, ${pulse})`;
            ctx.fill();
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
