LOGFILE=$(dirname $0)/logs/zk-admin.log
#export ZK_HOST="localhost:2181"
nohup node $(dirname $0)/app.js 2>&1 >>$LOGFILE &
