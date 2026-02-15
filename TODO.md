Tasks, issues, etc. (yes it in russian) 

# js
1. **проблема:** при переключении на меню "connect a device" "queue" canvas удаляется, в следствии чего capture stream ломается и фон перестает быть динамическим и синхронизованным с активным канвасом песни <br>
**решения в runtime**: включить любую другую песню и фон починится <br>
**<ins>фикс: исправлено с помощью observeNowPlaying</ins>**