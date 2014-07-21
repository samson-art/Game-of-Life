/*
All right reserved
(C) Duraki inc.
2014
*/

//константы
_height = 640;
_width = 640;
_numberOfCells = 64;
_step = _height/_numberOfCells;
_maxLiveCells = 15;
_speed = 150;
//GameCanvas
function GameCanvas(id){
    //рисуем поле
    this.canvas = document.getElementById(id);
    this.canvas.width = _width;
    this.canvas.height = _height;
    this.context = this.canvas.getContext("2d");
    this.context.strokeStyle = 'gray';
    for (var i = 0; i < _width; i += _step) {
        this.context.moveTo(i, 0);
        this.context.lineTo(i, _height);
        this.context.stroke();
    }
    for (var i = 0; i < _height; i += _step) {
        this.context.moveTo(0, i);
        this.context.lineTo(_width, i);
        this.context.stroke();
    }
}

GameCanvas.prototype.fillRect = function(i,j, color, w, h){
    w = w||(_step-2);
    h = h||(_step-2);
    this.context.fillStyle = color;
    this.context.fillRect(j*_step+1, i*_step+1, w, h);
};
GameCanvas.prototype.strokeRect = function(i,j){
    this.context.strokeStyle = 'gray';
    this.context.strokeRect(j*_step, i*_step, _step, _step);
};
GameCanvas.prototype.clear = function(){
    for (var i = 0; i<_numberOfCells; i++) {
        for (var j = 0; j < _numberOfCells; j++) {
                this.strokeRect(j, i);
                this.fillRect(j, i, 'white');
        }
    }
};
GameCanvas.prototype.draw = function draw(gameMatrix){
    for (var i = 0; i< _numberOfCells; i++) {
        for (var j = 0; j < _numberOfCells; j++) {
            if (gameMatrix[j][i] == 1){
                this.fillRect(j, i, 'blue');
            } else if (gameMatrix[j][i] == 2) {
                this.fillRect(j, i, 'red');
            }
        }
    }
};

// WebSocket Client
function WSClient() {
    this.host = 'localhost';
    this.port = 8888;
    this.uri = '/ws';
    this.ws = null;
    this.connection = false;
}
 
WSClient.prototype.sendMessage = function(command, data) {
    if (!data) {
        data = null;
    }
    var message = {'command': command, 'data': data};
    this.ws.send(JSON.stringify(message));
};
 
WSClient.prototype.connect = function() {
    if (!this.ws) {
        this.ws = new WebSocket('ws://' + this.host + ':' + this.port + this.uri);
        this.ws.onopen = this.onOpen.bind(this);
        this.ws.onclose = this.onClose.bind(this);
        this.ws.onerror = this.onError.bind(this);
        this.ws.onmessage = this.onMessage.bind(this);
    }
};
 
WSClient.prototype.disconnect = function() {
    if (this.ws) {
        this.ws.close();
    }
};
 
WSClient.prototype.onOpen = function() {
    console.log('Соединение открыто');
    this.connection = true;
    $('#btn-search').show('slow').text('Search game').removeAttr('disabled');
};
 
WSClient.prototype.onClose = function(event) {
    if (event.wasClean) {
        console.log('Соединение закрыто чисто');
    } else {
        console.log('Обрыв соединения'); // например, "убит" процесс сервера
    }
    console.log('Код: ' + event.code + ' причина: ' + event.reason);
    this.ws = null;
    this.connection = false;
    $('#btn-search').hide().text('Search game').removeAttr('disabled');
    $('#gameCanvas').hide();
    $('#btn-send').hide();
};
 
WSClient.prototype.onError = function(error) {
    console.log('Ошибка ' + error.message);
};
 
WSClient.prototype.onMessage = function(event) {
    
};
 
WSClient.prototype.isConnected = function() {
    return this.connection;
};
// Game
function Game(element_id) {
//переменные
    this.hashList = [];
    this.onTop = false;
    this.prepareingToGame = false;
    this.myLiveCells = 0;
    this.enemyesLiveCells = 0;
//матрица игры
    this.matrix = [];
    this.gen_matrix();
//веб-сокет
    this.p_array = [];
    this.gen_p_array();
    this.client = new WSClient();
//форма страницы    
    this.element = document.getElementById(element_id);
    this.button_html = '<canvas id="gameCanvas">Игровое поле</canvas>' + 
        '<form>' +
        '<button id="btn-connect">Connect</button>' +
        '<button id="btn-search">Search game</button>' +
        '<button id="btn-send">Send map</button>' +
        '</form>';
    this.element.innerHTML = this.button_html;
//кнопочки
    this.btn_connect = document.getElementById('btn-connect');
    this.btn_search = document.getElementById('btn-search');
    this.btn_send = document.getElementById('btn-send');
//
    $('#gameCanvas').hide();
    $('#btn-search').hide();
    $('#btn-send').hide();
    this.canvas = new GameCanvas('gameCanvas');
//обработка ответов серевера
    this.client.onMessage = function(event){
        var m = JSON.parse(event.data);
        console.log(event.data);
        var message = m['message'];
        switch(message){
            case 'open':

                break;
            case 'close':

                break;
            case 'in_queue':
                this.btn_search.disabled = true;
                this.btn_search.innerHTML = 'We are founding game for you';
                break;
            case 'game_found':
                this.gen_matrix();
                this.canvas.clear();
                $('#gameCanvas').show('slow');
                var data = m['data'];
                console.log(data.top);
                if(data.top) {
                    this.onTop = true;
                    this.canvas.fillRect(_numberOfCells/2, 0, 'rgba(0,0,255,0.45)', _width, _height/2);
                } else {
                    this.onTop = false;
                    this.canvas.fillRect(0, 0, 'rgba(255,0,0,0.45)', _width, _height/2);
                }
                this.prepareingToGame = true;
                $('#btn-search').hide();
                $('#btn-send').show('slow');
                break;
            case 'start_game':
                this.prepareingToGame = false;
                $('#btn-send').text('Game begin').attr('disabled');
                var map = m['data'];
                this.matrix = map.map;
                for (var i = 0; i < _numberOfCells; i++){
                    for(var j = 0; j < _numberOfCells; j++){
                        if(this.matrix[i][j]==2 && !this.onTop){
                            this.enemyesLiveCells += 1;
                        } else if (this.matrix[i][j]==1 && this.onTop){
                            this.enemyesLiveCells += 1;
                        }
                    }
                }
                this.beginGame();
                break;
            case 'game_over':
                this.myLiveCells = 0;
                this.enemyesLiveCells = 0;
                this.gen_matrix();
                this.hashList = [];
                $('#btn-search').show('slow').text('Search game').removeAttr('disabled');
                $('#btn-send').text('Send map').hide().removeAttr('disabled');
                break;

        }
    }.bind(this);
//обработка нажатий на игровое поле
    $('#gameCanvas').click(function(e) {  
        if (this.prepareingToGame){
            if (this.myLiveCells < _maxLiveCells){
                var offset = $('#gameCanvas').offset();
                var relativeX = (e.pageX - offset.left);
                var relativeY = (e.pageY - offset.top);
                i = relativeY/_step | 0;
                j = relativeX/_step | 0;
                if (this.onTop){
                    if (i<_numberOfCells/2){
                        this.canvas.fillRect(i,j, 'red');
                        this.matrix[i][j] = 2;
                        this.myLiveCells+=1;
                    } else {
                        alert("Расставляйте клетки на своей территории");
                    }
                } else{
                    if (i>=_numberOfCells/2){
                        this.canvas.fillRect(i,j, 'blue');
                        this.matrix[i][j] = 1;
                        this.myLiveCells+=1;
                    } else {
                        alert("Расставляйте клетки на своей территории");
                    }
                }
            } else {
                alert("Вы расставили все свои клетки");
            } 
        }
    }.bind(this));
//обработка нажатий на кнопки
    this.btn_connect.onclick = function(event) {
        event.preventDefault();
        if (this.client.isConnected()) {
            this.client.disconnect();
            this.btn_connect.innerHTML = 'Connect';
            this.canvas.clear();
        } else {
            this.client.connect();
            this.btn_connect.innerHTML = 'Disconnect';
        }
    }.bind(this);
 
    this.btn_search.onclick = function(event) {
        event.preventDefault();
        this.client.sendMessage('search');
    }.bind(this);
 
    this.btn_send.onclick = function(event) {
        this.btn_send.disabled = true;
        this.btn_send.innerHTML = 'Wait for opponent';
        this.prepareingToGame = false;
        event.preventDefault();
        this.client.sendMessage('ready', {'map': this.matrix});
    }.bind(this);
};

Game.prototype.life_count = function(j, i, _numberOfCells){
    var prevX, prevY, nextX, nextY;
    if (i-1 >= 0){
        prevY = i-1;
    } else {
        prevY = _numberOfCells-1;
    }
    if (i+1 < _numberOfCells){
        nextY = i+1;
    } else {
        nextY = 0;
    }
    if (j-1 >= 0){
        prevX = j-1;
    } else {
        prevX = _numberOfCells-1;
    }
    if (j+1 < _numberOfCells){
        nextX = j+1;
    } else {
        nextX = 0;
    }
    var cnt1 = 0;
    var cnt2 = 0;
    var a = [this.matrix[prevX][prevY],
        this.matrix[prevX][nextY],
        this.matrix[nextX][nextY],
        this.matrix[nextX][prevY],
        this.matrix[j][prevY],
        this.matrix[j][nextY],
        this.matrix[prevX][i],
        this.matrix[nextX][i]];
    for(var k = 0; k < a.length; k++){
        if (a[k] == 1){
            cnt1 +=1;
        }
        if (a[k] == 2){
            cnt2 +=1;
        }
    }
    return [cnt1, cnt2];
};


Game.prototype.compare = function(a, b){
    for(var i = 0; i <_numberOfCells; i++){
        for(var j = 0; j < _numberOfCells; j++){
            if (a[j][i] != b[j][i]){
                return false;
            }
        }
    }
    return true;
};
Game.prototype.genNext = function(){
    var nextMatrix = [];
    for (var i = 0; i<_numberOfCells; i++) {
        nextMatrix[i] = [];
        for (var j = 0; j < _numberOfCells; j++) {
            var cnt = this.life_count(i, j, _numberOfCells);
            if (cnt[0] == 3 && this.matrix[i][j] == 0){
                nextMatrix[i][j] = 1;
                if (this.onTop){
                    this.enemyesLiveCells += 1;
                } else {
                    this.myLiveCells += 1;
                }
            } else if (cnt[1] == 3 && this.matrix[i][j] == 0){
                nextMatrix[i][j] = 2;
                if (this.onTop){
                    this.myLiveCells += 1;
                } else {
                    this.enemyesLiveCells+=1;
                }
            } else if ((cnt[0]<2 || cnt[0]>3) && this.matrix[i][j]==1) {
                nextMatrix[i][j] = 0;
                if (this.onTop){
                    this.enemyesLiveCells -= 1;
                } else {
                    this.myLiveCells -= 1;
                }
            } else if ((cnt[1]<2 || cnt[1]>3) && this.matrix[i][j]==2) {
                nextMatrix[i][j] = 0;
                if (this.onTop){
                    this.myLiveCells -= 1;
                } else {
                    this.enemyesLiveCells -=1;
                }
            }
            else {
                nextMatrix[i][j] = this.matrix[i][j];
            }
        }
    }
    return nextMatrix;
};
Game.prototype.beginGame = function(){
    var mainTimer = setInterval(function(){
        var lastGen = this.matrix;
        this.canvas.clear();
        this.matrix = this.genNext();
        this.canvas.draw(this.matrix);
        var str;
        if (this.myLiveCells == 0) {
            clearInterval(mainTimer);
            alert('Игра окончена\nВы проиграли\nУ вас не осталось живых клеток\nКоличество живых клеток соперника: '+ this.enemyesLiveCells);
            this.client.sendMessage('finish');
        } else if (this.enemyesLiveCells == 0){
            clearInterval(mainTimer);
            alert('Игра окончена\nВы выиграли\nУ вашего противника не осталось живых клеток\nКоличество живых клеток соперника: '+ this.enemyesLiveCells);
            this.client.sendMessage('finish');
        } else if (this.compare(lastGen, this.matrix)) {
            clearInterval(mainTimer);
            if (this.myLiveCells == this.enemyesLiveCells){
                str = 'Ничья!';
            } else {
                str = this.myLiveCells > this.enemyesLiveCells ? 'Вы победили ' : 'Вы проиграли ';
            }
            alert('Игра окончена\nСтатичная конфигурация\n'+str+'\nКоличество ваших живых клеток: ' + this.myLiveCells + '\nКоличество живых клеток соперника: '+ this.enemyesLiveCells);
            this.client.sendMessage('finish');
        } else if(!this.find_loop()){
            clearInterval(mainTimer);
            if (this.myLiveCells == this.enemyesLiveCells){
                str = 'Ничья!';
            } else {
                str = this.myLiveCells > this.enemyesLiveCells ? 'Вы победили ' : 'Вы проиграли ';
            }
            alert('Игра зашла в цикл\n'+str+'\nКоличество ваших живых клеток: ' + this.myLiveCells + '\nКоличество живых клеток соперника: '+ this.enemyesLiveCells);
            this.client.sendMessage('finish');
        }
    }.bind(this), _speed);
};
Game.prototype.find_loop = function(){
    var hash = 0;
    for (var i = 0; i < _numberOfCells; i++) {
        for (var j = 0; j < _numberOfCells; j++) {
            hash += this.matrix[i][j]*this.p_array[i][j];
            //hash |= 0; // Convert to 32bit integer
        }
    }
    for (var i = 0; i<this.hashList.length; i++){
        if(this.hashList[i] == hash){
            return false;
        }
    }
    this.hashList.push(hash);
    return true;
};
Game.prototype.gen_matrix = function(){
    for (var i = 0; i<_numberOfCells; i++) {
        this.matrix[i] = [];
        for (var j = 0; j < _numberOfCells; j++) {
            this.matrix[i][j] = 0;
        }
    }
};
Game.prototype.gen_p_array = function(){
    var x = 0;
    for (var i = 0; i < _numberOfCells; i++){
        this.p_array[i] = [];
        for (var j = 0; j < _numberOfCells; j++){
            this.p_array[i][j] = Math.pow(3,x+1);
            if (Math.pow(3,x+1) > 2 * (Math.pow(10,15)) / (64 * 3)){
                x = 0;
            } else {
                x++;
            }
        }
    }
};