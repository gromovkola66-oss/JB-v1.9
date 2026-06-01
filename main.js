// ==========================================
// MAIN.JS — Точка входа
// Инициализация приложения
// ==========================================

(function() {
    'use strict';

    // Ждём загрузки DOM
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Internet Provider Tycoon v0.1.0');
        console.log('Загрузка...');

        // Показываем главное меню
        UI.showMainMenu();

        // Предзагрузка — проверяем есть ли сохранения
        for (let i = 1; i <= 3; i++) {
            const info = Game.getSaveInfo(i);
            if (info) {
                console.log(`Слот ${i}: ${info.companyName} (${info.date})`);
            }
        }

        console.log('Готово! Приятной игры.');
    });

    // Предотвращаем случайное закрытие вкладки во время игры
    window.addEventListener('beforeunload', (e) => {
        if (Game.running) {
            Game.save();
        }
    });
})();
