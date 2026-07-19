# -*- coding: utf-8 -*-
"""
폰(같은 와이파이)에서 공부 앱에 접속할 수 있게 해주는 서버.
이 파일을 직접 실행하지 말고 "폰으로 공부하기.bat" 를 더블클릭하세요.
"""
import http.server
import socketserver
import socket
import os
import sys

PORT = 8347
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def lan_ip():
    """공유기가 준 이 PC의 로컬 IP를 찾는다."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # 실제로 데이터를 보내진 않음
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 파일을 수정했을 때 폰에서 바로 반영되도록 캐시 끄기
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # 접속 로그로 화면 지저분해지지 않게


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    ip = lan_ip()
    url = "http://%s:%d" % (ip, PORT)
    bar = "=" * 52
    print("")
    print(bar)
    print("   전기산업기사 스터디  -  폰 접속 서버")
    print(bar)
    print("")
    print("  1) 핸드폰이 이 PC와 '같은 와이파이'인지 확인하세요")
    print("  2) 핸드폰 크롬 주소창에 아래 주소를 입력하세요")
    print("")
    print("        " + url)
    print("")
    print("  3) 크롬 메뉴(점 3개) > '홈 화면에 추가' 를 누르면")
    print("     아이콘으로 바로 열 수 있어요")
    print("")
    print(bar)
    print("  이 검은 창을 닫으면 폰에서 접속이 끊깁니다.")
    print("  공부가 끝나면 창을 닫으세요.")
    print(bar)
    print("")

    try:
        with Server(("0.0.0.0", PORT), Handler) as httpd:
            print("  서버 실행 중...  (종료하려면 이 창을 닫거나 Ctrl+C)")
            print("")
            httpd.serve_forever()
    except OSError as e:
        print("")
        print("  [!] 서버를 시작하지 못했어요: %s" % e)
        print("  이미 다른 창에서 실행 중일 수 있어요. 그 창을 닫고 다시 해보세요.")
        input("\n  엔터를 누르면 닫힙니다...")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n  서버를 종료했습니다.")


if __name__ == "__main__":
    main()
