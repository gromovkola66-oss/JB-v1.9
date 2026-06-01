// ==========================================
// INFRASTRUCTURE.JS — Инфраструктура сети
// Кабели, вышки, узлы, дата-центры
// ==========================================

const Infrastructure = {
    // Все объекты инфраструктуры
    cables: [],       // Проложенные кабели
    towers: [],       // Вышки связи
    nodes: [],        // Узлы/серверные
    datacenters: [],  // Дата-центры

    // Состояние прокладки кабеля
    cableDrawing: false,
    cableStart: null,
    cablePath: [],
    cableType: 'copper', // текущий выбранный тип

    // Типы кабелей
    CABLE_TYPES: {
        copper: {
            name: 'Медный кабель',
            speed: 10,          // Мбит/с
            maxClients: 20,
            costPerTile: 50,
            maintenanceCost: 5,
            reliability: 0.85,
            color: '#c87533',
            era: 1,
            degradeRate: 0.001,
        },
        coaxial: {
            name: 'Коаксиальный',
            speed: 100,
            maxClients: 50,
            costPerTile: 120,
            maintenanceCost: 10,
            reliability: 0.92,
            color: '#3366cc',
            era: 1,
            degradeRate: 0.0008,
        },
        fiber: {
            name: 'Оптоволокно',
            speed: 1000,
            maxClients: 200,
            costPerTile: 350,
            maintenanceCost: 15,
            reliability: 0.99,
            color: '#00cc88',
            era: 2,
            degradeRate: 0.0003,
        },
        fiber_xgs: {
            name: 'XGS-PON Оптика',
            speed: 10000,
            maxClients: 500,
            costPerTile: 800,
            maintenanceCost: 25,
            reliability: 0.995,
            color: '#00ffaa',
            era: 4,
            degradeRate: 0.0001,
        },
    },

    // Типы вышек
    TOWER_TYPES: {
        wifi: {
            name: 'Wi-Fi точка',
            speed: 50,
            radius: 3,          // тайлов
            maxClients: 30,
            cost: 2000,
            maintenanceCost: 100,
            reliability: 0.8,
            era: 2,
            power: 50,
        },
        '3g': {
            name: '3G Вышка',
            speed: 20,
            radius: 6,
            maxClients: 100,
            cost: 8000,
            maintenanceCost: 300,
            reliability: 0.88,
            era: 3,
            power: 150,
        },
        '4g': {
            name: '4G LTE Вышка',
            speed: 150,
            radius: 5,
            maxClients: 200,
            cost: 15000,
            maintenanceCost: 500,
            reliability: 0.93,
            era: 3,
            power: 250,
        },
        '5g': {
            name: '5G Вышка',
            speed: 1000,
            radius: 3,
            maxClients: 500,
            cost: 35000,
            maintenanceCost: 800,
            reliability: 0.95,
            era: 5,
            power: 400,
        },
    },

    // Типы узлов
    NODE_TYPES: {
        small: {
            name: 'Серверная стойка',
            capacity: 50,       // макс подключений
            cost: 5000,
            maintenanceCost: 200,
            power: 100,
            era: 1,
        },
        medium: {
            name: 'Мини-АТС',
            capacity: 500,
            cost: 25000,
            maintenanceCost: 800,
            power: 300,
            era: 1,
        },
        large: {
            name: 'Узел связи',
            capacity: 5000,
            cost: 80000,
            maintenanceCost: 2000,
            power: 800,
            era: 2,
        },
        hub: {
            name: 'Магистральный узел',
            capacity: 50000,
            cost: 300000,
            maintenanceCost: 8000,
            power: 2000,
            era: 4,
        },
    },

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.cables = [];
        this.towers = [];
        this.nodes = [];
        this.datacenters = [];
        this.cableDrawing = false;
        this.cableStart = null;
        this.cablePath = [];
        this.cableType = 'copper';
    },

    // ==========================================
    // КАБЕЛИ
    // ==========================================
    startCable(x, y) {
        if (!this.cableDrawing) {
            // Начинаем прокладку
            this.cableDrawing = true;
            this.cableStart = { x, y };
            this.cablePath = [{ x, y }];
        } else {
            // Завершаем прокладку
            this.cablePath.push({ x, y });
            this.finishCable();
        }
    },

    finishCable() {
        if (this.cablePath.length < 2) {
            this.cancelCable();
            return;
        }

        const type = this.CABLE_TYPES[this.cableType];
        if (!type) {
            this.cancelCable();
            return;
        }

        // Проверяем разблокирован ли тип кабеля
        if (!Tech.isCableUnlocked(this.cableType)) {
            UI.notify(`Нужно исследовать технологию для ${type.name}!`, 'warning');
            this.cancelCable();
            return;
        }

        // Строим полный путь между точками (по прямым линиям)
        const fullPath = this.buildCablePath(this.cablePath);
        const totalCost = fullPath.length * type.costPerTile;

        if (!Game.canAfford(totalCost)) {
            UI.notify(`Недостаточно средств! Нужно ${Game.formatMoney(totalCost)}`, 'warning');
            this.cancelCable();
            return;
        }

        // Проверяем что все тайлы проходимы
        for (const point of fullPath) {
            const tile = MapSystem.getTile(point.x, point.y);
            if (!tile || tile.type === MapSystem.TILE_TYPES.LOCKED ||
                tile.type === MapSystem.TILE_TYPES.WATER) {
                UI.notify('Невозможно проложить кабель через это место!', 'warning');
                this.cancelCable();
                return;
            }
        }

        Game.spend(totalCost);

        const cable = {
            id: this.cables.length,
            type: this.cableType,
            path: fullPath,
            health: 100,
            currentClients: 0,
            maxClients: type.maxClients,
            speed: type.speed,
            active: true,
            buildDate: { ...Game.time },
            maintenanceCost: type.maintenanceCost * fullPath.length * 0.1,
        };

        this.cables.push(cable);

        // Отмечаем тайлы
        for (const point of fullPath) {
            const tile = MapSystem.getTile(point.x, point.y);
            if (tile) {
                tile.cable = cable.id;
            }
        }

        // Обновляем подключения
        this.updateConnections();

        Game.stats.cableLayedKm += fullPath.length * 0.032; // тайл = 32м
        UI.notify(`Проложен ${type.name} (${fullPath.length} тайлов)`, 'success');

        // Эффект строительства — частицы вдоль кабеля
        for (let i = 0; i < Math.min(fullPath.length, 10); i++) {
            const p = fullPath[Math.floor(i * fullPath.length / 10)];
            Renderer.spawnParticles(p.x, p.y, type.color, 3);
        }

        // Туториал
        Tutorial.trigger('cable_placed');

        this.cancelCable();
    },

    cancelCable() {
        this.cableDrawing = false;
        this.cableStart = null;
        this.cablePath = [];
    },

    // Построить путь между точками (Manhattan-style)
    buildCablePath(points) {
        const fullPath = [];
        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i];
            const to = points[i + 1];

            // Сначала по X, потом по Y
            const dx = Math.sign(to.x - from.x);
            const dy = Math.sign(to.y - from.y);

            let cx = from.x, cy = from.y;

            // Горизонтально
            while (cx !== to.x) {
                if (!fullPath.find(p => p.x === cx && p.y === cy)) {
                    fullPath.push({ x: cx, y: cy });
                }
                cx += dx;
            }
            // Вертикально
            while (cy !== to.y) {
                if (!fullPath.find(p => p.x === cx && p.y === cy)) {
                    fullPath.push({ x: cx, y: cy });
                }
                cy += dy;
            }
            // Конечная точка
            if (!fullPath.find(p => p.x === to.x && p.y === to.y)) {
                fullPath.push({ x: to.x, y: to.y });
            }
        }
        return fullPath;
    },

    // ==========================================
    // ВЫШКИ
    // ==========================================
    placeTower(x, y, towerType) {
        towerType = towerType || 'wifi';
        const type = this.TOWER_TYPES[towerType];
        if (!type) return false;

        // Проверяем разблокирована ли технология
        if (!Tech.isTowerUnlocked(towerType)) {
            UI.notify(`Нужно сначала исследовать технологию для ${type.name}!`, 'warning');
            return false;
        }

        const tile = MapSystem.getTile(x, y);
        if (!tile || tile.type === MapSystem.TILE_TYPES.LOCKED ||
            tile.type === MapSystem.TILE_TYPES.WATER ||
            tile.type === MapSystem.TILE_TYPES.BUILDING_RESIDENTIAL ||
            tile.type === MapSystem.TILE_TYPES.BUILDING_COMMERCIAL) {
            UI.notify('Нельзя установить вышку здесь!', 'warning');
            return false;
        }

        // Проверяем нет ли уже вышки
        if (this.towers.find(t => t.x === x && t.y === y)) {
            UI.notify('Здесь уже есть вышка!', 'warning');
            return false;
        }

        if (!Game.canAfford(type.cost)) {
            UI.notify(`Недостаточно средств! Нужно ${Game.formatMoney(type.cost)}`, 'warning');
            return false;
        }

        Game.spend(type.cost);

        const tower = {
            id: this.towers.length,
            x, y,
            type: towerType,
            health: 100,
            currentClients: 0,
            maxClients: type.maxClients,
            radius: type.radius,
            speed: type.speed,
            active: true,
            level: 1,
            buildDate: { ...Game.time },
            maintenanceCost: type.maintenanceCost,
            signalStrength: 1.0,
        };

        this.towers.push(tower);
        Game.stats.towersBuilt++;

        // Эффект строительства — частицы
        Renderer.spawnParticles(x, y, '#00bcd4', 8);

        this.updateConnections();
        UI.notify(`Установлена ${type.name}`, 'success');
        return true;
    },

    // ==========================================
    // УЗЛЫ
    // ==========================================
    placeNode(x, y, nodeType) {
        nodeType = nodeType || 'small';
        const type = this.NODE_TYPES[nodeType];
        if (!type) return false;

        const tile = MapSystem.getTile(x, y);
        if (!tile || tile.type === MapSystem.TILE_TYPES.LOCKED) {
            UI.notify('Нельзя установить узел здесь!', 'warning');
            return false;
        }

        if (this.nodes.find(n => n.x === x && n.y === y)) {
            UI.notify('Здесь уже есть узел!', 'warning');
            return false;
        }

        if (!Game.canAfford(type.cost)) {
            UI.notify(`Недостаточно средств! Нужно ${Game.formatMoney(type.cost)}`, 'warning');
            return false;
        }

        Game.spend(type.cost);

        const node = {
            id: this.nodes.length,
            x, y,
            type: nodeType,
            health: 100,
            currentLoad: 0,
            capacity: type.capacity,
            active: true,
            level: 1,
            buildDate: { ...Game.time },
            maintenanceCost: type.maintenanceCost,
            connectedCables: [],
        };

        this.nodes.push(node);
        // Эффект строительства
        Renderer.spawnParticles(x, y, '#4a6a8a', 6);
        // Туториал
        Tutorial.trigger('node_placed');
        this.updateConnections();
        UI.notify(`Установлен ${type.name}`, 'success');
        return true;
    },

    // ==========================================
    // ДАТА-ЦЕНТРЫ
    // ==========================================
    placeDatacenter(x, y) {
        const cost = 150000;
        const tile = MapSystem.getTile(x, y);

        if (!tile || tile.type === MapSystem.TILE_TYPES.LOCKED) {
            UI.notify('Нельзя построить дата-центр здесь!', 'warning');
            return false;
        }

        if (!Game.canAfford(cost)) {
            UI.notify(`Недостаточно средств! Нужно ${Game.formatMoney(cost)}`, 'warning');
            return false;
        }

        Game.spend(cost);

        const dc = {
            id: this.datacenters.length,
            x, y,
            health: 100,
            capacity: 10000,
            currentLoad: 0,
            active: true,
            level: 1,
            buildDate: { ...Game.time },
            maintenanceCost: 5000,
            hostingIncome: 0,
            servers: 10,
            maxServers: 50,
        };

        this.datacenters.push(dc);
        this.updateConnections();
        UI.notify('Дата-центр построен!', 'success');
        return true;
    },

    // ==========================================
    // СНОС И УЛУЧШЕНИЕ
    // ==========================================
    demolish(x, y) {
        // Удалить кабель
        const tile = MapSystem.getTile(x, y);
        if (tile && tile.cable !== null && tile.cable !== undefined) {
            const cable = this.cables[tile.cable];
            if (cable) {
                cable.active = false;
                // Очистить тайлы
                for (const p of cable.path) {
                    const t = MapSystem.getTile(p.x, p.y);
                    if (t) t.cable = null;
                }
                UI.notify('Кабель демонтирован', 'info');
                this.updateConnections();
                return;
            }
        }

        // Удалить вышку
        const towerIdx = this.towers.findIndex(t => t.x === x && t.y === y && t.active);
        if (towerIdx >= 0) {
            this.towers[towerIdx].active = false;
            UI.notify('Вышка демонтирована', 'info');
            this.updateConnections();
            return;
        }

        // Удалить узел
        const nodeIdx = this.nodes.findIndex(n => n.x === x && n.y === y && n.active);
        if (nodeIdx >= 0) {
            this.nodes[nodeIdx].active = false;
            UI.notify('Узел демонтирован', 'info');
            this.updateConnections();
            return;
        }
    },

    upgrade(x, y) {
        // Улучшить вышку
        const tower = this.towers.find(t => t.x === x && t.y === y && t.active);
        if (tower) {
            const upgradeCost = this.TOWER_TYPES[tower.type].cost * 0.5 * tower.level;
            if (!Game.canAfford(upgradeCost)) {
                UI.notify('Недостаточно средств для улучшения!', 'warning');
                return;
            }
            Game.spend(upgradeCost);
            tower.level++;
            tower.maxClients = Math.floor(tower.maxClients * 1.5);
            tower.speed = Math.floor(tower.speed * 1.3);
            tower.radius += 1;
            UI.notify(`Вышка улучшена до уровня ${tower.level}!`, 'success');
            this.updateConnections();
            return;
        }

        // Улучшить узел
        const node = this.nodes.find(n => n.x === x && n.y === y && n.active);
        if (node) {
            const upgradeCost = this.NODE_TYPES[node.type].cost * 0.4 * node.level;
            if (!Game.canAfford(upgradeCost)) {
                UI.notify('Недостаточно средств для улучшения!', 'warning');
                return;
            }
            Game.spend(upgradeCost);
            node.level++;
            node.capacity = Math.floor(node.capacity * 1.5);
            UI.notify(`Узел улучшен до уровня ${node.level}!`, 'success');
            return;
        }
    },

    // ==========================================
    // ПОДКЛЮЧЕНИЯ И ПОКРЫТИЕ
    // ==========================================
    updateConnections() {
        // Обновляем какие здания подключены
        for (const building of MapSystem.buildings) {
            building.connected = false;
            building.connectionType = null;
            building.connectionSpeed = 0;
            building.cableId = null;
            building.towerId = null;
        }

        // Кабельные подключения
        for (const cable of this.cables) {
            if (!cable.active) continue;
            const type = this.CABLE_TYPES[cable.type];

            for (const point of cable.path) {
                // Ищем здания рядом с кабелем
                const nearby = MapSystem.getBuildingsInRadius(point.x, point.y, 1.5);
                for (const building of nearby) {
                    // Берём лучшую скорость если уже подключено
                    if (!building.connected || type.speed > building.connectionSpeed) {
                        building.connected = true;
                        building.connectionType = 'cable';
                        building.connectionSpeed = type.speed;
                        building.cableId = cable.id;
                    }
                }
            }
        }

        // Беспроводные подключения (вышки) — только если лучше текущего
        for (const tower of this.towers) {
            if (!tower.active) continue;
            const nearby = MapSystem.getBuildingsInRadius(tower.x, tower.y, tower.radius);
            for (const building of nearby) {
                if (!building.connected || tower.speed > building.connectionSpeed) {
                    building.connected = true;
                    building.connectionType = building.connectionSpeed > 0 && building.connectionType === 'cable' && building.connectionSpeed >= tower.speed ? 'cable' : 'wireless';
                    building.connectionSpeed = Math.max(building.connectionSpeed, tower.speed);
                    if (building.connectionType === 'wireless') building.towerId = tower.id;
                }
            }
        }

        // Подсчёт покрытия
        const totalBuildings = MapSystem.buildings.length;
        const connectedBuildings = MapSystem.buildings.filter(b => b.connected).length;
        if (totalBuildings > 0) {
            Game.state.coverage = Math.round((connectedBuildings / totalBuildings) * 100);
        }
    },

    // Получить общую пропускную способность
    getTotalCapacity() {
        let capacity = 0;
        for (const node of this.nodes) {
            if (node.active) capacity += node.capacity;
        }
        return capacity;
    },

    // Получить общую нагрузку
    getTotalLoad() {
        return Game.state.totalClients;
    },

    // Получить среднюю скорость сети
    getAverageSpeed() {
        const connectedBuildings = MapSystem.buildings.filter(b => b.connected);
        if (connectedBuildings.length === 0) return 0;
        const totalSpeed = connectedBuildings.reduce((sum, b) => sum + (b.connectionSpeed || 0), 0);
        return Math.round(totalSpeed / connectedBuildings.length);
    },

    // ==========================================
    // ОБНОВЛЕНИЯ
    // ==========================================
    update() {
        // Деградация кабелей
        for (const cable of this.cables) {
            if (!cable.active) continue;
            const type = this.CABLE_TYPES[cable.type];
            cable.health -= type.degradeRate;
            if (cable.health <= 0) {
                cable.active = false;
                cable.health = 0;
                UI.notify(`Кабель #${cable.id} вышел из строя!`, 'danger');
                this.updateConnections();
            }
        }

        // Деградация вышек
        for (const tower of this.towers) {
            if (!tower.active) continue;
            tower.health -= 0.0005;
            if (tower.health <= 0) {
                tower.active = false;
                tower.health = 0;
                UI.notify(`Вышка #${tower.id} вышла из строя!`, 'danger');
                this.updateConnections();
            }
        }
    },

    dailyUpdate() {
        // Расчёт uptime
        const total = this.cables.filter(c => c.active).length +
                      this.towers.filter(t => t.active).length;
        const broken = this.cables.filter(c => !c.active && c.health <= 0).length +
                       this.towers.filter(t => !t.active && t.health <= 0).length;

        if (total > 0) {
            Game.state.uptime = Math.round((1 - broken / (total + broken)) * 100);
        } else {
            Game.state.uptime = 100;
        }
    },

    // Получить общую стоимость обслуживания
    getMaintenanceCost() {
        let total = 0;
        for (const cable of this.cables) {
            if (cable.active) total += cable.maintenanceCost;
        }
        for (const tower of this.towers) {
            if (tower.active) total += tower.maintenanceCost;
        }
        for (const node of this.nodes) {
            if (node.active) total += node.maintenanceCost;
        }
        for (const dc of this.datacenters) {
            if (dc.active) total += dc.maintenanceCost;
        }
        return total;
    },

    // Ремонт объекта
    repair(type, id) {
        let obj = null;
        let cost = 0;

        if (type === 'cable' && this.cables[id]) {
            obj = this.cables[id];
            cost = this.CABLE_TYPES[obj.type].costPerTile * obj.path.length * 0.3;
        } else if (type === 'tower' && this.towers[id]) {
            obj = this.towers[id];
            cost = this.TOWER_TYPES[obj.type].cost * 0.2;
        }

        if (!obj) return false;
        if (!Game.canAfford(cost)) {
            UI.notify('Недостаточно средств для ремонта!', 'warning');
            return false;
        }

        Game.spend(cost);
        obj.health = 100;
        obj.active = true;
        this.updateConnections();
        UI.notify('Ремонт завершён!', 'success');
        return true;
    },

    // ==========================================
    // ИНФОРМАЦИЯ
    // ==========================================
    getInfraInfo(x, y) {
        const info = { cables: [], towers: [], nodes: [], datacenters: [] };

        // Кабели на этом тайле
        const tile = MapSystem.getTile(x, y);
        if (tile && tile.cable !== null) {
            const cable = this.cables[tile.cable];
            if (cable) info.cables.push(cable);
        }

        // Вышки
        const tower = this.towers.find(t => t.x === x && t.y === y);
        if (tower) info.towers.push(tower);

        // Узлы
        const node = this.nodes.find(n => n.x === x && n.y === y);
        if (node) info.nodes.push(node);

        // Дата-центры
        const dc = this.datacenters.find(d => d.x === x && d.y === y);
        if (dc) info.datacenters.push(dc);

        return info;
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            cables: this.cables,
            towers: this.towers,
            nodes: this.nodes,
            datacenters: this.datacenters,
            cableType: this.cableType,
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.cables) this.cables = data.cables;
        if (data.towers) this.towers = data.towers;
        if (data.nodes) this.nodes = data.nodes;
        if (data.datacenters) this.datacenters = data.datacenters;
        if (data.cableType) this.cableType = data.cableType;
        this.updateConnections();
    },
};
