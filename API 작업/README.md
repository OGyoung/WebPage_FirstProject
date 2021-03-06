* **기능설계**

* **기능작성**
    
    - **현재 작업상황 및 해야할 일**

    |회원|관리자|포인트|유저 관점 게시물|관리자 관점 게시물|공용 게시물|총 개수|
    |:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|-----|
    |20/20|21/21|3/3|8/8|13/13|8/8|73/73|

    **계속 수정해야 할 것**</br>
    - transaction 
    - res.status() (O) -> 하면 좋지만 반드시는 아닌듯
    - 크롤링 반복 되는 부분 없애기(지금 pk값으로 종료되게 함)
    - autoincrement 대안 (O) → 나열되는 번호를 db에서 부를때 프론트에서 번호를 매겨서 처리할 수 있어서 db에서 삭제될 때만 생각하면 되겠다.
    - 파일 여러개 업로드 및 다운로드
    - 관리자/회원 게시판 공통으로 쓰는 부분 합치자 (O)
    - member 전화번호 암호화
    - url 간소화
    - mvc 패턴으로 바꿔서 구성해볼 생각해도 해보자

    - 06/20
        - AOS 작업 중 Bundle().apply{ this.putInt("data", data)}로 값을 전달할 수 있기 때문에 이용약관 체크 여부 API 삭제

    - 05/13
        - common_board.js와 user_board.js 수정
        - 회원 및 유저 관련한 API 부분을 jwt로 수정

    - 05/12
        - member.js에서 세션을 jwt로 수정

    - 05/11
        - member.js에서 세션을 jwt로 수정

    - 05/10
        - jwt_middleware 구현 (검증 처리 마무리)
        - `next()로 값을 어떻게 넘길 수 있을까` - > req.보낼값으로 간단하게 넘김

    - 05/07
        - jwt_middleware 생성 (구현 못함)

    - 04/19 
        - 전화번호 암호화 하면 관리자가 핸드폰 번호 어떻게 알아보지?

    - 04/14
        - error 응답 data 추가
        - 서버에서 실행하기 위해 git과 postman에 작업부분 복제해서 옮겨놓고 ip값 수정, ubuntu 에서 test

    - 04/13
        - 아이디어 업로드 시 점수 500포인트 일괄지급 고려
        - 회원 포인트 현황 해야함
        - 관리자 시점으로 공고정보게시판 필요한가? 클라이언트 페이지로 보면 되지 않을까
        - 작성한 api 중 게시물의 내용 부분은 유저랑 관리자랑 얻는 데이터가 같으니깐 하나만 쓰면 되지 않을까(ex-관리자 공지사항 내용 따로 작성할 필요 없음)
        - modified_board.js log 테이블들이 날짜만 저장하면서 필요 없어졌음
        - 게시물 번호 처리
        - 1차 마무리 끝
        - 파일 다운로드 까지 마무리

    - 04/12
        - transaction 알아보기 →  쿼리문 2개 나오면 무조건 써야할듯.. 에러 발생시 이전 쿼리문이 입력 되기 때문
        - 세션 부분 app.js로 수정해서 옮겼더니 모든 rotes 파일에 적용이 됐다. 적용해서 다른 설정 부분들도 시도해보자. 
        - 문의게시판 업로드 transaction 적용 실패
        - any 사용(파일 업로드 / array 대신)
        - autoincrement 대안 생각
        - db 시간 처리 now()로 , 문의게시판 업로드 now() 
        - 문의게시판 업로드 부분 db insert 문에서 rows 찍었을때 insertID 값을 사용하자

    - 04/11
        - point 라우트 생성/ 포인트 처리 시작
        - 관리자의 포인트 부여 및 회수 api에서 관리자 세션 이메일이 필요한데 path variables로 써도 될까?
        - 포인트 끝
        - 랭킹이나 크롤링 등 자동으로 업데이트 되어야 하는 부분은 따로 만들자
        - member_rank.js 랭킹 매낄 때 ROWNUM 썼는데 같은 포인트에 대한 같은 등수 처리는 다음에 해주자
        - 랭킹 업데이트 끝
        - 유저 게시물 시작
        - 회원 관점 문의게시판 내용까지 끝냄
        - 첨부파일 다운로드도 API 인지 질문하자

    - 04/09
        - 크롤링해서 얻어던 데이터 중에서 url 부분 http://~ 부분 생략되어있어서 넣어줘야 함.
        - board.js 로 모듈화 오류 해결 -> modified_board.js도 생성
        - 아이디어 목록, 문의사항 목록, 공고정보게시판 목록, 관심사업 목록, 공지사항 목록, 회원 목록 모듈화 끝
        - 회원 선택문의사항, 회원 선택 아이디어 모듈화
        - 페이징 시작 (where 절에서는 limit offset, 아닌 경우는 orders limit offset)
        - 페이징 마무리, 파일 업로드 시작
        - 파일 업로드 성공 ( 다운로드는 아직 ) 

    - 04/08
        - 크롤링해서 db에 저장하는 부분을 완전히 따로 묶었다.
        cron.schedule을 사용해서 6시간 마다 자동으로 실행되도록 설정. 실행 시, anno_num에 pk 걸어놔서 pk error 전까지 insert 되다가 멈출 에정
        - 클롤링 되는 사이트에서 게시물이 삭제 되었을 경우 db 처리는 다음에 생각하자. 
        - admins.js의 공고정보게시판 보는 부분은 공통으로 빼서 처리하자
        - 게시물 처리 board.js 에서하자
        - 회원 아이디어 목록 분리했는데 board.js 에서는 값이 순서대로 잘 나오는데 호출 시에 먼저 값이 undefined로 찍혀버림, then 함수를 쓸 수가 없음.

    - 04/07
        - 소프트웨어융합대학 사이트를 크롤링 했는데 문자 타입이 EUC-KR로 되어있어서 막혔다.
        iconv를 통해서 문자 깨지는 것을 해결하려 하는데 잘 안된다. → 한림대 일송아트홀 사이트로 변경...
        - admins.js 로 와서 크롤링 동기 부분을 비동기 처리

    - 04/06
        - 검색(fulltext) 사용할 때 mysql에서 테이블에 index 설정 해놔야 한다.
        - 2글자 제한으로 변경, IN boolean mode로 검색 설정 변경
        - 공고정보게시판 크롤링 사용, 크롤링 공부 

    - 04/05
        - 검색 시작, 검색 api 따로 필요없음. member.js 아이디어 목록 검색 부분 
        - member.js 응답 설정해서 수정
        - 04/01에 썼던 js파일 따로 만드는 부분 할 필요 없을듯 (검색 코드가 짧아서)

    - 04/02
        - 포인트 삭제는 관리자만 할 수 있음, 포인트를 회수할 때 삭제.(평가 후 회수여서 delete만 하면 될 듯)

    - 04/01
        - 관리자API에서 회원리스트, 회원 상세페이지 흐름도 그리자
        - member API에서 포인트 현황 부분 랭킹 처리 따로 빼는거( 랭킹을 주기에 맞춰서 업데이트 형식으로 )
        - **검색은 js파일 따로 만들어서 관리자, 회원에서 둘 다 쓰자**   
            - 검색 기능을 하는 틀을 모듈로 만든다.
            - 각 게시물의 API에서 그 틀만 불러서 사용
    

    - **회원 관련 API**
        - 회원가입 전 이용약관 동의
        - 회원가입 (전화번호 암호화)
        - 회원 이메일 중복확인
        - 회원 이메일 인증키 보내기
        - 회원 이메일 인증키 입력
        - 회원 비밀번호 찾기
        - 회원 비밀번호 재설정
        - 회원 정보 불러오기
        - 회원 정보 수정
        - 회원 로그인
        - 회원 로그아웃
        - 회원 탈퇴
        - 회원 포인트 현황 (랭킹 빼내자)
        - 회원 포인트 사용내역 
        - 회원 포인트 적립내역 
        - 회원 아이디어 목록
        - 관심사업 등록
        - 관심사업 해제
        - 관심사업 목록
        - 고객센터 메일전송
    
    - **관리자 관련 API**
        ***회원 목록~상세목록까지만***
        - 관리자 이메일 중복확인
        - 관리자 로그인
        - 관리자 로그아웃
        - 관리자 탈퇴처리

        - 회원 목록

        - 회원 상세 페이지
        - 회원 로그목록
        - 회원 아이디어 목록
        - 회원 아이디어 내용
        - 선택한 아이디어 수정 목록
        - 선택한 아이디어 수정 내용
        - 회원 문의게시판 목록
        - 회원 문의게시판 내용
        - 선택한 회원 문의게시판 수정 목록
        - 선택한 회원 문의게시판 수정 내용
        - 회원 관심사업 목록
        - 회원 관심사업 내용
        - 회원 정지처리

        - 고객센터 목록 
        - 고객센터 내용
        - 고객센터 답변

    - **포인트 관련 API**
        - 관리자의 포인트 부여 및 회수 ( 회원 상세 페이지에서 아이디어 목록일지 내용 보기일지 생각)
        - 회원 포인트 사용
        - 회원 포인트 현황

    - **유저 관점 게시물 API**
        
        - 공지사항 목록
        
        - 문의게시판 목록
        - 문의게시판 업로드 (truncate 해야함)
        - 문의게시판 수정 페이지
        - 문의게시판 내용 수정

        - 아이디어 목록
        - 아이디어 업로드 (truncate 해야함)
        - 아이디어 내용수정

    - **관리자 관점 게시물API**
        - 관리자 로그 목록
        
        - 공지사항 목록
        - 공지사항 업로드
        - 공지사항 수정페이지
        - 공지사항 내용수정
        - 공지사항 수정로그
        - 공지사항 삭제

        - 아이디어 목록
        - 아이디어 수정 로그
        - 아이디어 삭제

        - 문의게시판 목록
        - 문의게시판 답변
        - 문의게시판 삭제

    - **공용 게시판 게시물API**
        - 공고정보게시판 목록
        - 공고정보게시판 내용

        - 공지사항 내용
        - 공지사항 첨부파일 다운로드

        - 문의게시판 내용
        - 문의게시판 첨부파일 다운로드

        - 아이디어 내용
        - 아이디어 첨부파일 다운로드




        



        



