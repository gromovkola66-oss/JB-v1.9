// ==========================================
// CLIENTS.JS — Система клиентов
// Сегменты, удовлетворённость, подключение, отток
// ==========================================

const Clients = {
    // Все клиенты (агрегированные по зданиям)
    clients: [],

    // Очередь заявок на подключение
    connectionQueue: [],

    // Статистика оттока
    churnStats: {
        thisMonth: 0,
        lastMonth: 0,
        reasons: {},
    },

    // Сегменты клиентов
    SEGMENTS: {
        elderly: {
            name: 'Пенсионеры',
            icon: '👴',
            speedNeed: 5,
            priceSensitivity: 0.9,   // очень чувствительны к цене
            patience: 1.5,           // терпеливые
            demandGrowth: 0.01,      // медленно растут требования
            churnResistance: 0.7,    // неохотно меняют провайдера
            weight: 0.15,            // доля в популяции
        },
        family: {
            name: 'Семьи',
            icon: '👨‍👩‍👧',
            speedNeed: 50,
            priceSensitivity: 0.6,
            patience: 1.0,
            demandGrowth: 0.05,
            churnResistance: 0.5,
            weight: 0.3,
        },
        gamer: {
            name: 'Геймеры',
            icon: '🎮',
            speedNeed: 100,
            priceSensitivity: 0.3,
            patience: 0.4,           // нетерпеливые
            demandGrowth: 0.08,
            churnResistance: 0.3,
            weight: 0.12,
        },
        freelancer: {
            name: 'Фрилансеры',
            icon: '💻',
            speedNeed: 80,
            priceSensitivity: 0.4,
            patience: 0.6,
            demandGrowth: 0.06,
            churnResistance: 0.4,
            weight: 0.1,
        },
        smallBusiness: {
            name: 'Малый бизнес',
            icon: '🏪',
            speedNeed: 100,
            priceSensitivity: 0.5,
            patience: 0.5,
            demandGrowth: 0.04,
            churnResistance: 0.6,
            weight: 0.15,
        },
        corporate: {
            name: 'Корпорации',
            icon: '🏢',
            speedNeed: 500,
            priceSensitivity: 0.1,
            patience: 0.3,
            demandGrowth: 0.07,
            churnResistance: 0.8,    // контракты держат
            weight: 0.05,
        },
        government: {
            name: 'Гос. учреждения',
            icon: '🏛️',
            speedNeed: 50,
            priceSensitivity: 0.2,
            patience: 0.8,
            demandGrowth: 0.02,
            churnResistance: 0.9,
            weight: 0.05,
        },
        streamer: {
            name: 'Стримеры',
            icon: '📺',
            speedNeed: 200,
            priceSensitivity: 0.2,
            patience: 0.3,
            demandGrowth: 0.1,
            churnResistance: 0.2,
            weight: 0.08,
        },
    },

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ
    // ==========================================
    init() {
        this.clients = [];
        this.connectionQueue = [];
        this.churnStats = { thisMonth: 0, lastMonth: 0, reasons: {} };
    },

    // ==========================================
    // ОБНОВЛЕНИЯ (каждый тик)
    // ==========================================
    update() {
        // Генерация новых заявок
        this.generateDemand();

        // Обработка очереди подключений
        this.processQueue();

        // Обновление удовлетворённости
        this.updateSatisfaction();

        // Проверка оттока
        this.checkChurn();
    },

    // ==========================================
    // ГЕНЕРАЦИЯ СПРОСА
    // ==========================================
    generateDemand() {
        // Шанс появления нового клиента зависит от:
        // 1. Покрытия (есть ли инфраструктура рядом)
        // 2. Маркетинга
        // 3. Репутации
        // 4. Цен (относительно конкурентов)

        const marketingEffect = Economy.getMarketingEffectiveness();
        const reputationEffect = Game.state.reputation / 100;
        const coverageEffect = (Game.state.coverage || 0) / 100;

        const baseChance = 0.01; // 1% за тик
        const totalChance = baseChance * (1 + marketingEffect) * reputationEffect * coverageEffect;

        if (Math.random() > totalChance) return;

        // Выбираем случайное подключённое здание
        const connectedBuildings = MapSystem.buildings.filter(b =>
            b.connected && b.connectedClients < b.maxClients
        );

        if (connectedBuildings.length === 0) return;

        const building = connectedBuildings[Math.floor(Math.random() * connectedBuildings.length)];

        // Определяем сегмент клиента на основе типа здания
        const segment = this.getSegmentForBuilding(building);

        // Добавляем в очередь
        this.connectionQueue.push({
            buildingId: building.id,
            segment,
            timestamp: Game.time.totalDays,
            patience: this.SEGMENTS[segment].patience * 10, // дней до отмены заявки
        });
    },

    getSegmentForBuilding(building) {
        const segments = Object.keys(this.SEGMENTS);
        const weights = segments.map(s => this.SEGMENTS[s].weight);

        // Корректируем веса по типу здания
        if (building.type === 'commercial') {
            const idx = segments.indexOf('smallBusiness');
            if (idx >= 0) weights[idx] *= 3;
            const corpIdx = segments.indexOf('corporate');
            if (corpIdx >= 0) weights[corpIdx] *= 2;
        } else if (building.type === 'industrial') {
            const corpIdx = segments.indexOf('corporate');
            if (corpIdx >= 0) weights[corpIdx] *= 4;
        } else if (building.type === 'government') {
            const govIdx = segments.indexOf('government');
            if (govIdx >= 0) weights[govIdx] *= 5;
        }

        // Взвешенный случайный выбор
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        for (let i = 0; i < segments.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return segments[i];
        }
        return segments[0];
    },

    // ==========================================
    // ОБРАБОТКА ОЧЕРЕДИ
    // ==========================================
    processQueue() {
        const supportBonus = Economy.getStaffBonus('support');
        const maxProcessPerTick = 1 + Math.floor(supportBonus * 0.5);

        let processed = 0;
        for (let i = this.connectionQueue.length - 1; i >= 0; i--) {
            if (processed >= maxProcessPerTick) break;

            const request = this.connectionQueue[i];

            // Проверяем терпение
            const waitDays = Game.time.totalDays - request.timestamp;
            if (waitDays > request.patience) {
                this.connectionQueue.splice(i, 1);
                this.recordChurn('queue_timeout');
                continue;
            }

            // Пытаемся подключить
            const building = MapSystem.buildings.find(b => b.id === request.buildingId);
            if (!building || !building.connected || building.connectedClients >= building.maxClients) {
                this.connectionQueue.splice(i, 1);
                continue;
            }

            // Выбираем тариф для клиента
            const tariff = this.chooseTariff(request.segment);
            if (!tariff) {
                // Нет подходящего тарифа — клиент уходит
                this.connectionQueue.splice(i, 1);
                this.recordChurn('no_suitable_tariff');
                continue;
            }

            // Подключаем!
            this.connectClient(building, request.segment, tariff);
            this.connectionQueue.splice(i, 1);
            processed++;
        }
    },

    // Клиент выбирает тариф
    chooseTariff(segment) {
        const segData = this.SEGMENTS[segment];
        const activeTariffs = Economy.tariffs.filter(t => t.active !== false);

        if (activeTariffs.length === 0) return null;

        // Оцениваем каждый тариф
        let bestTariff = null;
        let bestScore = -Infinity;

        for (const tariff of activeTariffs) {
            let score = 0;

            // Скорость достаточная?
            const speedRatio = tariff.speed / segData.speedNeed;
            if (speedRatio >= 1) {
                score += 30;
            } else if (speedRatio >= 0.5) {
                score += 15;
            } else {
                score -= 20; // слишком медленный
            }

            // Цена приемлемая?
            const avgPrice = Economy.getAveragePrice() || tariff.price;
            const priceRatio = tariff.price / avgPrice;
            score -= priceRatio * segData.priceSensitivity * 20;

            // Безлимитный трафик — бонус
            if (tariff.dataLimit === 0) {
                score += 10;
            }

            // Добавляем случайность
            score += (Math.random() - 0.5) * 10;

            if (score > bestScore) {
                bestScore = score;
                bestTariff = tariff;
            }
        }

        // Минимальный порог привлекательности
        if (bestScore < -10) return null;

        return bestTariff;
    },

    // ==========================================
    // ПОДКЛЮЧЕНИЕ КЛИЕНТА
    // ==========================================
    connectClient(building, segment, tariff) {
        const client = {
            id: this.clients.length,
            buildingId: building.id,
            segment,
            tariffIndex: Economy.tariffs.indexOf(tariff),
            satisfaction: 70 + Math.random() * 20, // 70-90 начальная
            connectedDate: { ...Game.time },
            monthsActive: 0,
            complaints: 0,
            recommended: 0, // скольким порекомендовал
            lastIssue: null,
        };

        this.clients.push(client);
        building.connectedClients++;
        tariff.subscribers = (tariff.subscribers || 0) + 1;
        Game.state.totalClients++;
        Game.stats.clientsEverConnected++;

        // Сарафанное радио — увеличиваем спрос здания
        building.demandLevel = Math.min(1, building.demandLevel + 0.05);
    },

    // ==========================================
    // УДОВЛЕТВОРЁННОСТЬ
    // ==========================================
    updateSatisfaction() {
        const diffSettings = Game.getDiffSettings();

        for (const client of this.clients) {
            const segData = this.SEGMENTS[client.segment];
            const tariff = Economy.tariffs[client.tariffIndex];
            if (!tariff) continue;

            const building = MapSystem.buildings.find(b => b.id === client.buildingId);
            if (!building) continue;

            let delta = 0;

            // Скорость vs потребность
            const actualSpeed = building.connectionSpeed || 0;
            const neededSpeed = segData.speedNeed * (1 + segData.demandGrowth * client.monthsActive);
            if (actualSpeed >= neededSpeed) {
                delta += 0.1;
            } else if (actualSpeed >= neededSpeed * 0.5) {
                delta -= 0.05;
            } else {
                delta -= 0.2;
            }

            // Uptime
            if (Game.state.uptime < 95) {
                delta -= (100 - Game.state.uptime) * 0.02;
            }

            // Цена vs рынок
            const avgPrice = Economy.getAveragePrice();
            if (tariff.price > avgPrice * 1.3) {
                delta -= 0.05 * segData.priceSensitivity;
            } else if (tariff.price < avgPrice * 0.8) {
                delta += 0.03;
            }

            // Поддержка
            const supportQuality = Economy.getStaffBonus('support');
            if (supportQuality > 0) {
                delta += supportQuality * 0.02;
            } else {
                delta -= 0.01; // нет поддержки — плохо
            }

            // Терпение сегмента
            delta *= (1 / segData.patience);

            // Применяем сложность
            delta *= (1 / diffSettings.clientPatience);

            // Обновляем удовлетворённость (0-100)
            client.satisfaction = Math.max(0, Math.min(100, client.satisfaction + delta));
        }
    },

    // ==========================================
    // ОТТОК КЛИЕНТОВ
    // ==========================================
    checkChurn() {
        const diffSettings = Game.getDiffSettings();

        for (let i = this.clients.length - 1; i >= 0; i--) {
            const client = this.clients[i];
            const segData = this.SEGMENTS[client.segment];

            // Базовый шанс оттока зависит от удовлетворённости
            let churnChance = 0;
            if (client.satisfaction < 20) {
                churnChance = 0.05;
            } else if (client.satisfaction < 40) {
                churnChance = 0.02;
            } else if (client.satisfaction < 60) {
                churnChance = 0.005;
            } else {
                churnChance = 0.001; // даже довольные иногда уходят
            }

            // Модификаторы
            churnChance *= (1 - segData.churnResistance * 0.5);
            churnChance *= diffSettings.competitorAggression;

            // Конкуренты переманивают
            if (AI.competitors && AI.competitors.length > 0) {
                const cheaperCompetitor = AI.competitors.find(c =>
                    c.avgPrice < Economy.getAveragePrice() * 0.8
                );
                if (cheaperCompetitor) {
                    churnChance *= 1.5;
                }
            }

            // Проверка
            if (Math.random() < churnChance) {
                this.disconnectClient(i, 'dissatisfaction');
            }
        }
    },

    disconnectClient(index, reason) {
        const client = this.clients[index];
        if (!client) return;

        const building = MapSystem.buildings.find(b => b.id === client.buildingId);
        if (building) {
            building.connectedClients = Math.max(0, building.connectedClients - 1);
        }

        const tariff = Economy.tariffs[client.tariffIndex];
        if (tariff) {
            tariff.subscribers = Math.max(0, (tariff.subscribers || 1) - 1);
        }

        this.clients.splice(index, 1);
        Game.state.totalClients = Math.max(0, Game.state.totalClients - 1);

        this.recordChurn(reason);
    },

    recordChurn(reason) {
        this.churnStats.thisMonth++;
        this.churnStats.reasons[reason] = (this.churnStats.reasons[reason] || 0) + 1;
    },

    // ==========================================
    // САРАФАННОЕ РАДИО
    // ==========================================
    wordOfMouth() {
        // Довольные клиенты рекомендуют (увеличивают спрос)
        for (const client of this.clients) {
            if (client.satisfaction > 80 && Math.random() < 0.01) {
                const building = MapSystem.buildings.find(b => b.id === client.buildingId);
                if (building) {
                    // Увеличиваем demand в соседних зданиях
                    const nearby = MapSystem.getBuildingsInRadius(building.x, building.y, 3);
                    for (const nb of nearby) {
                        if (!nb.connected || nb.connectedClients < nb.maxClients) {
                            nb.demandLevel = Math.min(1, nb.demandLevel + 0.02);
                        }
                    }
                    client.recommended++;
                }
            }
        }

        // Недовольные клиенты отговаривают
        for (const client of this.clients) {
            if (client.satisfaction < 30 && Math.random() < 0.02) {
                const building = MapSystem.buildings.find(b => b.id === client.buildingId);
                if (building) {
                    const nearby = MapSystem.getBuildingsInRadius(building.x, building.y, 3);
                    for (const nb of nearby) {
                        nb.demandLevel = Math.max(0, nb.demandLevel - 0.01);
                    }
                }
                // Может оставить жалобу
                client.complaints++;
                if (client.complaints >= 3) {
                    Game.state.reputation = Math.max(0, Game.state.reputation - 1);
                }
            }
        }
    },

    // ==========================================
    // ЕЖЕМЕСЯЧНЫЕ ОБНОВЛЕНИЯ
    // ==========================================
    monthlyUpdate() {
        // Сарафанное радио
        this.wordOfMouth();

        // Обновляем статистику оттока
        this.churnStats.lastMonth = this.churnStats.thisMonth;
        this.churnStats.thisMonth = 0;

        // Увеличиваем стаж клиентов
        for (const client of this.clients) {
            client.monthsActive++;
        }

        // Рост репутации от довольных клиентов
        const avgSatisfaction = this.getAverageSatisfaction();
        if (avgSatisfaction > 80) {
            Game.state.reputation = Math.min(100, Game.state.reputation + 1);
        } else if (avgSatisfaction < 40) {
            Game.state.reputation = Math.max(0, Game.state.reputation - 2);
        }
    },

    // ==========================================
    // СТАТИСТИКА
    // ==========================================
    getAverageSatisfaction() {
        if (this.clients.length === 0) return 0;
        const total = this.clients.reduce((sum, c) => sum + c.satisfaction, 0);
        return Math.round(total / this.clients.length);
    },

    getClientsBySegment() {
        const result = {};
        for (const key of Object.keys(this.SEGMENTS)) {
            result[key] = this.clients.filter(c => c.segment === key).length;
        }
        return result;
    },

    getChurnRate() {
        if (this.clients.length === 0) return 0;
        return Math.round((this.churnStats.lastMonth / Math.max(1, this.clients.length)) * 100);
    },

    getQueueLength() {
        return this.connectionQueue.length;
    },

    getTotalPotentialClients() {
        let total = 0;
        for (const building of MapSystem.buildings) {
            total += building.maxClients;
        }
        return total;
    },

    getConnectionRate() {
        const potential = this.getTotalPotentialClients();
        if (potential === 0) return 0;
        return Math.round((Game.state.totalClients / potential) * 100);
    },

    // ==========================================
    // СЕРИАЛИЗАЦИЯ
    // ==========================================
    serialize() {
        return {
            clients: this.clients,
            connectionQueue: this.connectionQueue,
            churnStats: this.churnStats,
        };
    },

    deserialize(data) {
        if (!data) return;
        if (data.clients) this.clients = data.clients;
        if (data.connectionQueue) this.connectionQueue = data.connectionQueue;
        if (data.churnStats) this.churnStats = data.churnStats;
    },
};
