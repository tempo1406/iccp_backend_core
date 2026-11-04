http://localhost:3333/api-docs#/

tạo guard trong nest nhanh:
  nest g gu guard/name-guard

tạo nhanh module trong nest:
  nest g resource name-resource
 
get key redis
  redis-cli 
  KEYS *


Cài websocket
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io

Lệnh connect redis bằng trong docker: docker exec -it redis_container redis-cli -a 12345