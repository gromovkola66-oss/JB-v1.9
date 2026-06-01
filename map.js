// ==========================================
// MAP.JS — Система карты
// Генерация города, тайлы, зум, скролл, расширение
// ==========================================

const MapSystem = {
    // Настройки
    tileSize: 42, // пикселей на тайл
    gridWidth: 60, // тайлов (начальный район)
    gridHeight: 60,
    maxWidth: 200, // максимальный размер мира
    maxHeight: 200,

    // Камера
    camera: {
        x: 0,
        y: 0,
        zoom: 1.0,
        minZoom: 0.3,
        maxZoom: 3.0,
        targetX: 0,
        targetY: 0,
        targetZoom: 1.0,
        smoothing: 0.12,
    },

    // Данные карты
    tiles: [], // 2D массив тайлов
    buildings: [], // Массив зданий на карте
    roads: [], // Сетка дорог
    zones: [], // Разблокированные зоны

    // Типы тайлов
    TILE_TYPES: {
        EMPTY: 0,
        GRASS: 1,
        ROAD: 2,
        BUILDING_RESIDENTIAL: 3,
        BUILDING_COMMERCIAL: 4,
        BUILDING_INDUSTRIAL: 5,
        BUILDING_GOVERNMENT: 6,
        PARK: 7,
        WATER: 8,
        TREE: 9,
        LOCKED: 10,
    },

    // Управление
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    cameraStartX: 0,
    cameraStartY: 0,
    hoveredTile: null,
    selectedTile: null,

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.tiles = [];
        this.buildings = [];
        this.roads = [];
        this.zones = [
            { id: 0, name: 'Центр', x: 20, y: 20, w: 20, h: 20, unlocked: true, cost: 0 },
            { id: 1, name: 'Север', x: 20, y: 0, w: 20, h: 20, unlocked: false, cost: 30000 },
            { id: 2, name: 'Юг', x: 20, y: 40, w: 20, h: 20, unlocked: false, cost: 30000 },
            { id: 3, name: 'Запад', x: 0, y: 20, w: 20, h: 20, unlocked: false, cost: 25000 },
            { id: 4, name: 'Восток', x: 40, y: 20, w: 20, h: 20, unlocked: false, cost: 25000 },
            { id: 5, name: 'Северо-Запад', x: 0, y: 0, w: 20, h: 20, unlocked: false, cost: 50000 },
            { id: 6, name: 'Северо-Восток', x: 40, y: 0, w: 20, h: 20, unlocked: false, cost: 50000 },
            { id: 7, name: 'Юго-Запад', x: 0, y: 40, w: 20, h: 20, unlocked: false, cost: 50000 },
            { id: 8, name: 'Юго-Восток', x: 40, y: 40, w: 20, h: 20, unlocked: false, cost: 50000 },
        ];

        this.generateMap();
        this.centerCamera();
        this.setupInput();
    },

    // ==========================================
    // ГЕНЕРАЦИЯ КАРТЫ
    // ==========================================
    generateMap() {
        // Создаём пустую сетку
        this.tiles = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                this.tiles[y][x] = {
                    type: this.TILE_TYPES.LOCKED,
                    building: null,
                    road: false,
                    cable: null,
                    zoneId: -1,
                };
            }
        }

        // Разблокируем начальную зону
        this.unlockZoneById(0);
    },

    unlockZoneById(zoneId) {
        const zone = this.zones[zoneId];
        if (!zone) return;
        zone.unlocked = true;

        // Генерируем содержимое зоны
        for (let y = zone.y; y < zone.y + zone.h && y < this.gridHeight; y++) {
            for (let x = zone.x; x < zone.x + zone.w && x < this.gridWidth; x++) {
                this.tiles[y][x].type = this.TILE_TYPES.GRASS;
                this.tiles[y][x].zoneId = zoneId;
            }
        }

        // Генерируем дороги
        this.generateRoads(zone);
        // Генерируем здания
        this.generateBuildings(zone);
        // Генерируем декорации
        this.generateDecor(zone);
    },

    generateRoads(zone) {
        // Горизонтальные дороги
        const roadSpacing = 5;
        for (let ry = zone.y + 2; ry < zone.y + zone.h - 1; ry += roadSpacing) {
            for (let x = zone.x; x < zone.x + zone.w; x++) {
                if (ry < this.gridHeight && x < this.gridWidth) {
                    this.tiles[ry][x].type = this.TILE_TYPES.ROAD;
                    this.tiles[ry][x].road = true;
                }
            }
        }

        // Вертикальные дороги
        for (let rx = zone.x + 3; rx < zone.x + zone.w - 1; rx += roadSpacing) {
            for (let y = zone.y; y < zone.y + zone.h; y++) {
                if (y < this.gridHeight && rx < this.gridWidth) {
                    this.tiles[y][rx].type = this.TILE_TYPES.ROAD;
                    this.tiles[y][rx].road = true;
                }
            }
        }
    },

    generateBuildings(zone) {
        const T = this.TILE_TYPES;

        for (let y = zone.y; y < zone.y + zone.h; y++) {
            for (let x = zone.x; x < zone.x + zone.w; x++) {
                if (y >= this.gridHeight || x >= this.gridWidth) continue;
                if (this.tiles[y][x].type !== T.GRASS) continue;

                // Здания рядом с дорогами
                if (this.isAdjacentToRoad(x, y)) {
                    const rand = Math.random();
                    if (rand < 0.4) {
                        // Жилой дом
                        const building = this.createBuilding(x, y, 'residential');
                        this.tiles[y][x].type = T.BUILDING_RESIDENTIAL;
                        this.tiles[y][x].building = building;
                        this.buildings.push(building);
                    } else if (rand < 0.55) {
                        // Коммерческое
                        const building = this.createBuilding(x, y, 'commercial');
                        this.tiles[y][x].type = T.BUILDING_COMMERCIAL;
                        this.tiles[y][x].building = building;
                        this.buildings.push(building);
                    } else if (rand < 0.6) {
                        // Промышленное
                        const building = this.createBuilding(x, y, 'industrial');
                        this.tiles[y][x].type = T.BUILDING_INDUSTRIAL;
                        this.tiles[y][x].building = building;
                        this.buildings.push(building);
                    }
                }
            }
        }
    },

    generateDecor(zone) {
        const T = this.TILE_TYPES;
        for (let y = zone.y; y < zone.y + zone.h; y++) {
            for (let x = zone.x; x < zone.x + zone.w; x++) {
                if (y >= this.gridHeight || x >= this.gridWidth) continue;
                if (this.tiles[y][x].type !== T.GRASS) continue;

                const rand = Math.random();
                if (rand < 0.08) {
                    this.tiles[y][x].type = T.TREE;
                } else if (rand < 0.1) {
                    this.tiles[y][x].type = T.PARK;
                }
            }
        }
    },

    createBuilding(x, y, type) {
        const configs = {
            residential: {
                variants: ['apartment', 'house_small', 'house_medium', 'house_large'],
                maxClients: () => Math.floor(Math.random() * 8) + 2,
                color: '#4a6fa5',
            },
            commercial: {
                variants: ['office', 'shop', 'cafe', 'bank'],
                maxClients: () => Math.floor(Math.random() * 5) + 1,
                color: '#6a9f4a',
            },
            industrial: {
                variants: ['factory', 'warehouse', 'workshop'],
                maxClients: () => Math.floor(Math.random() * 3) + 1,
                color: '#9f7a4a',
            },
            government: {
                variants: ['school', 'hospital', 'admin'],
                maxClients: () => Math.floor(Math.random() * 4) + 2,
                color: '#7a4a9f',
            }
        };

        const config = configs[type] || configs.residential;
        const variant = config.variants[Math.floor(Math.random() * config.variants.length)];

        return {
            id: this.buildings.length,
            x, y, type, variant,
            maxClients: config.maxClients(),
            connectedClients: 0,
            connected: false, // подключено ли к сети
            connectionType: null, // 'cable', 'wireless'
            satisfaction: 0,
            demandLevel: Math.random() * 0.5 + 0.3, // насколько хотят интернет
            color: config.color,
            height: Math.random() * 0.4 + 0.6, // визуальная высота
        };
    },

    // ==========================================
    // РАСШИРЕНИЕ ТЕРРИТОРИИ
    // ==========================================
    unlockZone(zoneId) {
        const zone = this.zones[zoneId];
        if (!zone || zone.unlocked) return false;

        if (!Game.canAfford(zone.cost)) {
            UI.notify('Недостаточно средств для расширения!', 'warning');
            return false;
        }

        // Проверяем смежность с разблокированной зоной
        if (!this.isZoneAdjacentToUnlocked(zoneId)) {
            UI.notify('Зона должна граничить с открытой территорией!', 'warning');
            return false;
        }

        Game.spend(zone.cost);
        this.unlockZoneById(zoneId);
        Game.state.unlockedAreas++;
        UI.notify(`Зона "${zone.name}" разблокирована!`, 'success');
        return true;
    },

    isZoneAdjacentToUnlocked(zoneId) {
        const zone = this.zones[zoneId];
        for (const other of this.zones) {
            if (!other.unlocked || other.id === zoneId) continue;
            // Проверяем граничат ли зоны
            if (zone.x + zone.w >= other.x && zone.x <= other.x + other.w &&
                zone.y + zone.h >= other.y && zone.y <= other.y + other.h) {
                return true;
            }
            // Смежность по стороне
            if ((zone.x + zone.w === other.x || other.x + other.w === zone.x) &&
                !(zone.y + zone.h <= other.y || other.y + other.h <= zone.y)) return true;
            if ((zone.y + zone.h === other.y || other.y + other.h === zone.y) &&
                !(zone.x + zone.w <= other.x || other.x + other.w <= zone.x)) return true;
        }
        return false;
    },

    // ==========================================
    // УТИЛИТЫ КАРТЫ
    // ==========================================
    isAdjacentToRoad(x, y) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
                const tile = this.tiles[ny]?.[nx];
                if (tile && tile.road) return true;
            }
        }
        return false;
    },

    getTile(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return null;
        if (!this.tiles[y]) return null;
        return this.tiles[y][x] || null;
    },

    getBuildingAt(x, y) {
        const tile = this.getTile(x, y);
        return tile ? tile.building : null;
    },

    isValidPosition(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    },

    isBuildable(x, y) {
        const tile = this.getTile(x, y);
        if (!tile) return false;
        return tile.type === this.TILE_TYPES.GRASS || tile.type === this.TILE_TYPES.ROAD;
    },

    // Получить все здания в радиусе
    getBuildingsInRadius(x, y, radius) {
        const result = [];
        for (const b of this.buildings) {
            const dist = Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2);
            if (dist <= radius) result.push(b);
        }
        return result;
    },

    // Подсчёт зданий по типу
    countBuildings(type) {
        return this.buildings.filter(b => b.type === type).length;
    },

    // Все здания в зоне
    getBuildingsInZone(zoneId) {
        return this.buildings.filter(b => {
            const tile = this.getTile(b.x, b.y);
            return tile && tile.zoneId === zoneId;
        });
    },

    // ==========================================
    // КАМЕРА
    // ==========================================
    centerCamera() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        const centerX = this.gridWidth * this.tileSize / 2;
        const centerY = this.gridHeight * this.tileSize / 2;
        this.camera.x = centerX - canvas.width / 2;
        this.camera.y = centerY - canvas.height / 2;
        this.camera.targetX = this.camera.x;
        this.camera.targetY = this.camera.y;
    },

    updateCamera() {
        // Плавное движение камеры
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * this.camera.smoothing;

        // Ограничения
        const maxX = this.gridWidth * this.tileSize * this.camera.zoom - 400;
        const maxY = this.gridHeight * this.tileSize * this.camera.zoom - 300;
        this.camera.targetX = Math.max(-200, Math.min(maxX, this.camera.targetX));
        this.camera.targetY = Math.max(-200, Math.min(maxY, this.camera.targetY));
    },

    zoomIn() {
        this.camera.targetZoom = Math.min(this.camera.maxZoom, this.camera.targetZoom + 0.2);
    },

    zoomOut() {
        this.camera.targetZoom = Math.max(this.camera.minZoom, this.camera.targetZoom - 0.2);
    },

    // Конвертация экранных координат в тайловые
    screenToTile(screenX, screenY) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        const cx = screenX - rect.left;
        const cy = screenY - rect.top;

        const worldX = (cx / this.camera.zoom) + this.camera.x;
        const worldY = (cy / this.camera.zoom) + this.camera.y;

        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize),
        };
    },

    // Конвертация тайловых координат в экранные
    tileToScreen(tileX, tileY) {
        return {
            x: (tileX * this.tileSize - this.camera.x) * this.camera.zoom,
            y: (tileY * this.tileSize - this.camera.y) * this.camera.zoom,
        };
    },

    // ==========================================
    // УПРАВЛЕНИЕ ВВОДОМ
    // ==========================================
    setupInput() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        // Мышь: перетаскивание
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
                // Средняя кнопка или Alt+ЛКМ — перетаскивание
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.cameraStartX = this.camera.targetX;
                this.cameraStartY = this.camera.targetY;
                e.preventDefault();
            } else if (e.button === 0) {
                // Левая кнопка — действие инструмента
                const tile = this.screenToTile(e.clientX, e.clientY);
                this.handleToolClick(tile.x, tile.y);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.dragStartX;
                const dy = e.clientY - this.dragStartY;
                this.camera.targetX = this.cameraStartX - dx / this.camera.zoom;
                this.camera.targetY = this.cameraStartY - dy / this.camera.zoom;
            } else {
                // Обновляем hovered тайл
                const tile = this.screenToTile(e.clientX, e.clientY);
                this.hoveredTile = tile;
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.hoveredTile = null;
        });

        // Зум колёсиком
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
            this.camera.targetZoom = Math.max(this.camera.minZoom,
                Math.min(this.camera.maxZoom, this.camera.targetZoom + zoomDelta));
        });

        // Контекстное меню
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Клавиатура: WASD для навигации
        document.addEventListener('keydown', (e) => {
            if (!Game.running) return;
            const moveSpeed = 20 / this.camera.zoom;
            switch(e.key.toLowerCase()) {
                case 'w': this.camera.targetY -= moveSpeed; break;
                case 's': this.camera.targetY += moveSpeed; break;
                case 'a': this.camera.targetX -= moveSpeed; break;
                case 'd': this.camera.targetX += moveSpeed; break;
                case ' ': Game.togglePause(); e.preventDefault(); break;
                case '1': Game.setSpeed(1); break;
                case '2': Game.setSpeed(2); break;
                case '3': Game.setSpeed(5); break;
            }
        });
    },

    // Обработка клика инструментом
    handleToolClick(x, y) {
        if (!this.isValidPosition(x, y)) return;

        const tool = UI.currentTool;
        const tile = this.getTile(x, y);
        if (!tile || tile.type === this.TILE_TYPES.LOCKED) {
            // Проверяем можно ли разблокировать зону
            for (const zone of this.zones) {
                if (!zone.unlocked && x >= zone.x && x < zone.x + zone.w &&
                    y >= zone.y && y < zone.y + zone.h) {
                    UI.showZoneUnlockDialog(zone);
                    return;
                }
            }
            return;
        }

        switch (tool) {
            case 'cable':
                Infrastructure.startCable(x, y);
                break;
            case 'tower':
                Infrastructure.placeTower(x, y);
                break;
            case 'node':
                Infrastructure.placeNode(x, y);
                break;
            case 'datacenter':
                Infrastructure.placeDatacenter(x, y);
                break;
            case 'select':
                this.selectedTile = { x, y };
                UI.showTileInfo(x, y);
                break;
            case 'demolish':
                Infrastructure.demolish(x, y);
                break;
            case 'upgrade':
                Infrastructure.upgrade(x, y);
                break;
        }
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            tiles: this.tiles,
            buildings: this.buildings,
            zones: this.zones,
            camera: { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom },
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.tiles) this.tiles = data.tiles;
        if (data.buildings) this.buildings = data.buildings;
        if (data.zones) this.zones = data.zones;
        if (data.camera) {
            this.camera.x = data.camera.x;
            this.camera.y = data.camera.y;
            this.camera.zoom = data.camera.zoom;
            this.camera.targetX = data.camera.x;
            this.camera.targetY = data.camera.y;
            this.camera.targetZoom = data.camera.zoom;
        }
        this.setupInput();
    },
};
