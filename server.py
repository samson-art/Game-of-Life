# -*- coding: utf-8 -*-
#All right reserved
#(C) Duraki inc.
#2014

import os
import uuid
import json
import numpy as np
from tornado import web
from tornado import httpserver
from tornado import ioloop
from tornado import websocket
 
ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_ROOT = os.path.join(ROOT, 'static')

#константы
_height = 640
_width = 640
_numberOfCells = 64
_step = _height/_numberOfCells
_maxLiveCells = 10
_maxNumberOfGen = 4*60
_speed = 500


class MainHandler(web.RequestHandler):
    def get(self):
        return self.render('index.html')
 
 
class WSHandler(websocket.WebSocketHandler):
    connections = dict()
    in_queue = list()
 
    def __init__(self, application, request, **kwargs):
        super(WSHandler, self).__init__(application, request, **kwargs)
        self.uid = None
        self.opponent = None
        self.on_top = None
        self.in_search = False
        self.in_game = False
        self.is_ready = False
        self.map = list()

    def __str__(self):
        return '<Connection UID = {}>'.format(self.uid)

    def __repr__(self):
        return str(self)

    def merge_maps(self):
        res = [[0 for _ in xrange(_numberOfCells)] for _ in xrange(_numberOfCells)]
        for i in xrange(_numberOfCells):
            for j in xrange(_numberOfCells):
                res[i][j] = self.map[i][j] + self.opponent.map[i][j]
        self.map = res
        self.opponent.map = res
 
    def open(self):
        self.uid = uuid.uuid4()
        self.connections[self.uid] = self
        directory = 'static/js/stdConf'
        files = os.listdir(directory)
        self.send_response('open', 'List of files sent', data=files)
        print 'New player with uid={}'.format(self.uid)
        print 'Players list: {}'.format(self.connections.values())
 
    def on_close(self):
        del self.connections[self.uid]
        if self.in_queue:
            self.in_queue.pop()
        print 'Player with uid={} exit'.format(self.uid)
        print 'Players list: {}'.format(self.connections.values())
 
    def on_message(self, message):
        jm = json.loads(message)
        command = jm.get('command', None)
        if command:
            if command == 'search':
                if self.in_search:
                    self.send_response('in_queue', 'You already in queue!', error=True)
                elif self.in_game:
                    self.send_response('game_found', 'You already in game!', error=True)
                elif not self.in_queue:
                    self.in_queue.append(self)
                    self.in_search = True
                    self.send_response('in_queue', 'You in a queue. Please wait...')
                else:
                    opponent = self.in_queue.pop()
                    if opponent != self:
                        self.opponent = opponent
                        self.on_top = True
                        self.in_game = True

                        opponent.opponent = self
                        opponent.on_top = False
                        opponent.in_game = True

                        self.send_response('game_found', 'We found game for you',
                                           data={'top': self.on_top})
                        opponent.send_response('game_found', 'We found game for you',
                                               data={'top': opponent.on_top})
                print 'Queue: {}'.format(self.in_queue)
            elif command == 'close':
                self.send_response('close')
                self.on_close()
            elif command == 'ready':
                data = jm.get('data')
                a = data.get('map')
                if a:
                    self.map = a
                    if self.opponent.map:
                        self.merge_maps()
                        self.send_response('start_game',
                                           'Game can started now!',
                                           data={'map': self.map})
                        self.opponent.send_response('start_game',
                                                    'Game can started now!',
                                                    data={'map': self.opponent.map})
                        self.in_search = False
                        self.opponent.in_search = False
                else:
                    self.send_response('map_is_empty', 'map_is_empty', error=True)
            elif command == 'finish':
                self.in_game = False
                #self.opponent.in_game = False
                self.send_response('game_over', 'Data cleared')
                #self.opponent.send_response('game_over', 'Data cleared')
                #self.opponent.map = list()
                self.map = list()
            elif command == 'get_conf':
                data = jm.get('data')
                conf = np.loadtxt('static/js/stdConf/'+data, dtype='int').tolist()
                self.send_response('return-conf', conf, data=conf)
            else:
                self.send_response('unknown_command', 'Unknown command', error=True)
        else:
            print 'No command found in request'
 
    def send_response(self, message, text, data=None, error=False):
        self.write_message(json.dumps({'message': message,
                                       'text': text,
                                       'error': error,
                                       'data': data}))


if __name__ == '__main__':
    app = web.Application([
        (r'/', MainHandler),
        (r'/ws', WSHandler),
        (r'/static/(.*)', web.StaticFileHandler, {'path': STATIC_ROOT}),
    ])
    server = httpserver.HTTPServer(app)
    server.listen(8888)
    ioloop.IOLoop.instance().start()