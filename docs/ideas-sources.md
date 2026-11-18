# 다른 아이디어 — 출처

2026-11-18. Firecrawl 플러그인 조회는 연결 오류로 실패했다. Awwwards 및 원 사이트는 브라우저로 확인하고 공식 제품 페이지와 데이터 저장소를 추가 조회했다.

## 디자인 참고

- PSP Production: https://www.awwwards.com/sites/psp-production → https://productionportugal.com/
- Spyker Cars: https://www.awwwards.com/sites/spyker-cars → https://www.spykercars.com/
- fromearth / 2050: https://www.awwwards.com/sites/fromearth-2050 → https://fromearth.love/
- fromearth 제작자 설명: https://www.fromanother.love/work/fromearth-2050

원 사이트의 소스 코드나 영상을 복제하지 않았다. 구조와 인터랙션에서 영감을 받은 개인 학습용 체험이다.

## StarCraft II 이미지

공식 페이지 https://starcraft2.blizzard.com/en-us/ 에서 공개 제공하는 종족 배경 이미지. © Blizzard Entertainment. 팬 디자인 학습용이며 공식 사이트가 아니다.

- sc2-terran.webp: https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt9cd3bf98e65b8707/696463686da53079a207b576/terran_background_1600.webp
- sc2-zerg.webp: https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blte8c97a6868d26ca6/696463ecb0cf6fda9326d713/zerg_background_1600.webp
- sc2-protoss.webp: https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltcc78bf9c7156737d/696463bb5a1d2ced5090a473/protoss_background_1600.webp

## ROG Zephyrus G15 이미지

사용자가 선택한 모델: ROG Zephyrus G15. 제품 이미지는 공식 GA503 2022 갤러리를 기준으로 한다. https://rog.asus.com/us/laptops/rog-zephyrus/rog-zephyrus-g15-2022-series/gallery/ . © ASUSTeK Computer Inc. 개인 학습용 디자인이며 판매 페이지가 아니다.

- zephyrus-angle.png: https://dlcdnwebimgs.asus.com/gain/62C83C9D-F17B-4A37-9759-3D7B8D8315EE/w1000/h732
- zephyrus-back.png: https://dlcdnwebimgs.asus.com/gain/053623F2-FC61-446C-B01D-62B32481DE7F/w1000/h732
- zephyrus-white.png: https://dlcdnwebimgs.asus.com/gain/4C5DE325-05DA-4DD1-A2D8-D8C783E1D243/w1000/h732
- zephyrus-white-back.png: https://dlcdnwebimgs.asus.com/gain/D69A0890-7A96-46F4-9BC8-18CF56BE340E/w1000/h732

## 지구본 지도

- 원본: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
- 제공자: Natural Earth. https://www.naturalearthdata.com/
- 이용 조건: Public domain. https://www.naturalearthdata.com/about/terms-of-use/
- 저장 파일: assets/ideas/countries.json. 원본의 이름·코드·대륙·표시 위치·폴리곤을 추출하고 좌표를 소수 셋째 자리로 반올림했다.
- 177개 지도 영역. 1:110m 저해상도 자료이므로 모든 작은 섬과 미소국가가 별도 영역으로 존재하지는 않는다. 국경·지역 표시는 법적·정치적 판단을 의미하지 않는다.
- 한국어 표시는 가능한 경우 브라우저 Intl.DisplayNames를 이용한다. 위도·경도는 원본의 표시 위치이며 행정 수도의 좌표라고 주장하지 않는다.
