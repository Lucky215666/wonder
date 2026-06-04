#!/bin/bash
# 尝试两个代理端口推送
ports=(7890 7892)
for port in "${ports[@]}"; do
  echo "尝试代理端口 $port ..."
  git -c "http.proxy=http://127.0.0.1:$port" -c "https.proxy=http://127.0.0.1:$port" push "$@"
  if [ $? -eq 0 ]; then
    echo "推送成功 (端口 $port)"
    exit 0
  fi
done
echo "所有代理端口均失败"
exit 1
