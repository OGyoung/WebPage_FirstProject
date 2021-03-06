/**
 * 설정 세팅
 */
var express = require('express');
var router = express.Router();
const crypto = require('crypto');

// db 연결
var getConnection = require('../setting/db.js');

// 응답 설정
var { success_request, error_request } = require('../setting/request.js');

// 세션 연결
var session = require('../setting/session.js');
router.use(session)

// 게시판 설정
var {idea_list, cs_list, anno_list, anno_look, inter_anno_list, notice_list, member_list, member_log_list, admin_log_list} = require('../setting/board.js');

// 게시판 수정 목록 설정
var {modified_idea, modified_cs} = require('../setting/modified_board.js')

// 메일 설정
var trans_mail = require('../setting/mail.js')

// 시간 설정
var {now_time, tomorrow_time} = require('../setting/time.js');


/*                    본문시작                    */


 const admin_check=1 // 관리자 확인 체크


/**
 * 관리자 이메일 중복 확인, http://localhost:3000/admins/idle/admins/has-same-id
 * 1. 입력된 이메일에서 value 값(이메일)만 가져옴
 * 2. member 테이블에 입력받은 이메일 값이 있는지 확인해서 있으면 생성불가, 없으면 생성가능 응답처리
 * 
*/
router.post('/idle/has-same-id', (req, res) => {

    console.log(now_time());

    // 관리자가 입력한 이메일 값
    let check_email = req.body.admin_email;
    console.log("입력 이메일 확인 : " + check_email);

    // db 연결
    getConnection(async(conn) => {
        try{
            await new Promise((res, rej)=>{
                // db에서 admin_email 값들 가져와서 check_email 과 같은지 비교
                let same_email_sql = 'SELECT admin_email FROM admin WHERE admin_email=?;';
                conn.query(same_email_sql, check_email, function (err, rows) {
                    if (err) {
                        conn.release();
                        error_request.data=err;
                        error_request.message = "member 테이블 조회 실패";
                        return rej(error_request);
                    }else if(rows == ''){
                        success_request.data={"use_email":check_email}
                        success_request.message = "아이디 생성가능"
                        return rej(success_request)
                    }
                    res();
                });
            });
            conn.release();
            error_request.data=null;
            error_request.message = "아이디 생성 불가능"
            res.send(error_request);
        } catch (req) {
            res.send(req);
        }
    })
});


/**
 * 관리자 로그인, http://localhost:3000/admins/idle/signin
 * 1. 관리자가 입력한 이메일과 비밀번호를 array에 저장
 * 2. 입력한 비밀번호는 해시화해서 db에서 조회
 * 3. 로그시간 업로드
 * 4. 세션 저장
 */
router.post('/idle/signin', (req, res)=>{

    let admin_email = req.body.admin_email; // 관리자 이메일
    let admin_pw = req.body.admin_pw; // 관리자 비번

    // 비밀번호 해시화
    admin_pw=crypto.createHash('sha512').update(admin_pw).digest('base64');

    //db 연결
    getConnection(async(conn)=>{
        try{
            // db에 일치하는 이메일과 비밀번호가 있는지 확인
            var admin_login_sql = 'SELECT * FROM admin WHERE admin_email=? AND admin_pw=? AND admin_secede=?;';
            var admin_login_param = [admin_email, admin_pw, 0];
            await new Promise((res, rej)=>{
                conn.query(admin_login_sql, admin_login_param, function (err, rows){
                    if (err || rows == '') {
                        error_request.data=err;
                        error_request.message="이메일 혹은 비밀번호가 틀렸습니다."
                        conn.release();
                        rej(error_request);
                    }
                    res(rows);
                })
            })
            
            // 로그인한 시간 확인, admin_log 테이블 업데이트
            var admin_log_sql ='UPDATE admin_log SET admin_login_lately=? WHERE admin_email=?;';
            var admin_log_param = [now_time(), admin_email];
            await new Promise((res,rej)=>{
                conn.query(admin_log_sql,admin_log_param, function(err, rows){
                    if(err || rows==''){
                        conn.release();
                        error_request.data=err;
                        error_request.message="amdin_log 테이블 에러"
                        rej(error_request);
                    }
                    res(rows);
                })
            })

            //세션 저장
            req.session.admin_email = admin_email;
            req.session.save(function () {
                success_request.data={
                    "admin_email" : admin_email
                }
                success_request.message="로그인에 성공하였습니다."
                conn.release();
                //res.redirect('/home'); // 홈으로 이동하게 하자
                return res.send(success_request)
            })
        }catch(err){
            res.send(err)
        }
    })
})


/**
 * 관리자 로그아웃, http://localhost:3000/admins/idle/logout
 * 1. destroy로 삭제
 */
 router.post('/idle/logout', (req, res) => {
    try {
        let admin_email = req.session.admin_email;
        req.session.destroy(function () {
            req.session;
            success_request.data={ "member_email":admin_email}
            success_request.message = "로그아웃에 성공하였습니다.";
            res.send(success_request)
            //res.redirect('/home'); // 홈으로 이동하게 하자
        });
    } catch {
        error_request.data=null;
        error_request.message = "로그아웃에 실패하였습니다.";
        res.send(error_res)
    }
})


/**
 * 관리자 탈퇴처리, http://localhost:3000/admins/idle/admin-secede
 * 1. 세션 이메일 사용
 * 2. admin 테이블에서 admin_secede 값을 1로 업데이트
 * 3. 세션 날리고 홈으로 이동
*/
router.delete('/idle/admin-secede', (req, res)=>{
    getConnection(async (conn)=>{
        try{
            var admin_email=req.session.admin_email; // 세션 이메일
            await new Promise((res, rej)=>{
                // admin 테이블에서 admin_secede 값 1로 업데이트
                var secede_sql = 'UPDATE admin SET admin_secede=? WHERE admin_email=?;';
                var secede_param = [1, admin_email];
                conn.query(secede_sql, secede_param, function (err, rows) {
                    if (err || rows == '') {
                        conn.release();
                        error_request.data=err;
                        error_request.message="admin_secede 값 변경 실패";
                        return rej(error_request);
                    }
                    res(rows);
                });
            });

            // 세션 삭제
            req.session.destroy(function () {
                conn.release();
                //res.redirect('/home'); // 홈으로 이동하게 하자
                success_request.message="탈퇴되었습니다."
                return res.send(success_request);
            })
        }catch(err){
            res.send(err);
        }
    })
})


/**
 * 회원 목록, http://localhost:3000/admins/idle/member-list
 * 회원 리스트 목록을 페이지에 어떻게 표현할지 더 생각해보자 ( 회원 이메일, 이름, 성별, 가입일자, 정지여부 보여줌)
 * 1. member 테이블에서 회원 리스트 뽑음
 */
router.get('/idle/member-list', (req, res)=>{

    console.log("검색할 내용: ", req.query.member_search_name)  // 검색 내용
    console.log("페이지 번호: ", req.query.page) // 페이지 번호


    member_list(req.query.member_search_name, req.query.page).then(member_list=>{
        res.send(member_list);
    });
})


/**
 * 회원 상세 페이지, http://localhost:3000/admins/idle/member-list/회원 이메일
 * 1. member 테이블에서 해당 회원의 member 테이블 정보 가져오기
 */
router.get('/idle/member-list/:member_email', (req, res)=>{
    
    getConnection(async(conn)=>{
        try{
            var member_email=req.params.member_email; //url 회원 이메일
            //해당 회원 member 테이블 정보 가져오기
            await new Promise((res,rej)=>{
                var member_detail_inform = 'SELECT * FROM member WHERE member_email=?'
                conn.query(member_detail_inform, member_email, function(err, rows){
                    if(err || rows==''){
                        error_request.data=err;
                        error_request.message="member 테이블에서 데이터 불러오기 실패";
                        conn.release();
                        return rej(error_request);
                    }
                    success_request.data=rows;
                    res(rows);
                })
            })

            conn.release();
            success_request.message="회원 정보 가져오기 성공";
            res.send(success_request)            
        }catch(err){
            res.send(err);
        }
    });
})


/**
 * 회원 로그목록, http://localhost:3000/admins/idle/member-list/회원 이메일/log
 * 회원가입시간, 로그인 시간 가져오자
 * 1. member_log 테이블에서 선택한 회원의 가입날짜 가져오기
 * 2. member_login_log 테이블에서 회원의 로그인 로그 가져오기
 * 3. 합쳐서 json 응답 보내기
 */
router.get('/idle/member-list/:member_email/log', (req, res)=>{

    console.log("회원 이메일: ", req.params.member_email); // 회원 이메일
    console.log("페이지 번호: ", req.query.page); // 페이지 번호


    member_log_list(req.params.member_email, req.query.page).then(member_log_list=>{
        res.send(member_log_list);
    });
    
    
})


/**
 * 회원 아이디어 목록, http://localhost:3000/admins/idle/member-list/회원 이메일/idea-list
 * 1. idea 테이블에서 해당 회원의 데이터를 가져온다.
 */
router.get('/idle/member-list/:member_email/idea-list', (req, res)=>{
    console.log("회원 이메일: ", req.params.member_email) // 회원 이메일
    console.log("검색할 내용: ",req.query.idea_search)  // 검색 내용
    console.log("페이지 번호: ", req.query.page) // 페이지 번호

    
    idea_list(req.params.member_email, req.query.idea_search, req.query.page, admin_check).then(member_idea_list=>{
        res.send(member_idea_list);
    });

})


/**
 * 회원 아이디어 내용 보기, http://localhost:3000/admins/idle/member-list/회원 이메일/idea-list/게시물 번호
 * 1. 회원 이메일 아이디 정보 가져오기
 * 2. idea 테이블에서 제목 내용 작성일 얻은포인트 관리자이메일 정보 필요(다 가져오자)
 * 사용하는 것은 아이디어 제목, 내용, 작성일, 얻은 포인트, 관리자 이메일
 */
router.get('/idle/member-list/:member_email/idea-list/:idea_id', (req, res)=>{

    getConnection(async(conn)=>{
        try{
            
            var member_email = req.params.member_email;
            var idea_id = req.params.idea_id;
            await new Promise((res,rej)=>{
                var idealist_look_sql='SELECT * FROM idea WHERE member_email=? AND idea_id=?;';
                var idealist_look_param=[member_email, idea_id];
                conn.query(idealist_look_sql, idealist_look_param, function(err, rows){
                    if(err || rows==''){
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message="해당 아이디어 정보를 가져오는데 실패했습니다.";
                        rej(error_request);
                    }
                    success_request.data=rows;
                    res(rows);
                })
            })

            conn.release();
            success_request.message="해당 아이디어 정보를 가져오는데 성공했습니다."
            res.send(success_request);
        }catch(err){
            res.send(err);
        }
    })
})


/**
 * 선택한 아이디어 수정 내용 목록, http://localhost:3000/admins/idle/member-list/회원 이메일/idea-list/게시물 번호/modified
 * 1. idea_log 테이블에서 idea_id와 일치한 정보가져오기
 */
router.get('/idle/member-list/:member_email/idea-list/:idea_id/modified',(req,res)=>{

    console.log("세션 이메일: ", req.params.idea_id) // 세션 이메일
    console.log("검색할 내용: ", req.query.idea_search)  // 검색 내용
    console.log("페이지 번호: ", req.query.page) // 페이지 번호


    modified_idea(req.params.idea_id, req.query.idea_search, admin_check, req.query.page).then(modified_idea=>{
        res.send(modified_idea);
    });
})


/**
 * 선택한 아이디어 수정 내용 보기, http://localhost:3000/admins/idle/member-list/회원 이메일/idea-list/게시물 번호/modified/modify-num
 * 1. idea_log 테이블의 id num 값을 저장
 * 2. 해당 id를 가진 아이디어, 선택한 아이디어의 num로 idea_log 테이블을 조회하여 데이터 가져온다.
 */
router.get('/idle/member-list/:member_email/idea-list/:idea_id/modified/:modify_num', (req,res)=>{
    

    getConnection(async(conn)=>{
        try{
            var idea_id = req.params.idea_id;
            var modify_num = req.params.modify_num;

            // 해당 id를 가진 아이디어, 선택한 아이디어의 num로 idea_log 테이블을 조회하여 데이터 가져온다.
            await new Promise((res,rej)=>{
                var modifyidea_look_sql='SELECT * FROM idea_log WHERE idea_id=? AND idea_num=?;';
                var modifyidea_look_param=[idea_id, modify_num];
                conn.query(modifyidea_look_sql, modifyidea_look_param, function(err, rows){
                    if(err || rows==''){
                        conn.release();
                        error_request.data=err;
                        error_request.message="수정 전 데이터 가져오기 실패";
                        rej(error_request);
                    }
                    success_request.data=rows;
                    res(rows);
                })
            })

            conn.release();
            success_request.message="수정 전 데이터 가져오기 성공";
            res.send(success_request);
        }catch(err){
            res.send(err);
        }
    })
})


/**
 * 회원 문의게시판 목록, http://localhost:3000/admins/idle/member-list/회원 이메일/cs-list
 * 1. cs테이블에서 해당 회원 이메일 조회하여 데이터 가져오기, 파일 필요없음
 */
router.get('/idle/member-list/:member_email/cs-list', (req, res)=>{
    
    console.log("문의게시판 번호: ", req.params.member_email) // 문의게시판 번호
    console.log("검색할 내용: ", req.query.cs_search)  // 검색 내용
    console.log("페이지 번호: ", req.query.page) // 페이지 번호

    cs_list(req.params.member_email, req.query.cs_search, req.query.page, admin_check).then(member_cs_list=>{
        res.send(member_cs_list);
    });
})


/**
 * 회원 문의게시판 내용 보기, http://localhost:3000/admins/idle/member-list/회원 이메일/cs-list/cs-id
 * 1. cs_file_dir 조인
 */
router.get('/idle/member-list/:member_email/cs-list/:cs_id', (req, res)=>{
    
    
    getConnection(async(conn)=>{
        try{
            var member_email=req.params.member_email;
            var cs_id=req.params.cs_id;

            await new Promise((res, rej)=>{
                var cslist_look_sql='SELECT * FROM cs JOIN cs_file_dir ON (cs.cs_id = cs_file_dir.cs_id) WHERE member_email=? AND cs.cs_id=?;';
                var cslist_look_param=[member_email, cs_id];
                conn.query(cslist_look_sql,cslist_look_param, function(err, rows){
                    if(err || rows==''){
                        conn.release();
                        error_request.data=err;
                        error_request.message="해당 cs 정보를 가져오는데 실패했습니다.";
                        rej(error_request);
                    }
                    success_request.data=rows;
                    res(rows);
                })
            })
            conn.release();
            success_request.message = "해당 cs 정보를 가져오는데 성공했습니다.";
            res.send(success_request);
        }catch(err){
            res.send(err);
        }
    })
})


/**
 * 선택한 회원 문의게시판 수정 내용 목록, http://localhost:3000/admins/idle/member-list/회원 이메일/cs-list/cs-id/modified
 */
router.get('/idle/member-list/:member_email/cs-list/:cs_id/modified', (req,res)=>{

    console.log("문의게시판 번호: ", req.params.cs_id) // 문의게시판 번호
    console.log("검색할 내용: ", req.query.cs_search)  // 검색 내용
    console.log("페이지 번호: ", req.query.page) // 페이지 번호

    modified_cs(req.params.cs_id, req.query.cs_search, req.query.page).then(modified_cs=>{
        res.send(modified_cs);
    });
})


/**
 * 선택한 회원 문의게시판 수정 내용 보기, http://localhost:3000/admins/idle/member-list/회원 이메일/cs-list/cs-id/modified/문의게시판 번호
 */
 router.get('/idle/member-list/:member_email/cs-list/:cs_id/modified/:modify_num', (req,res)=>{
    
    getConnection(async(conn)=>{
        try{
            var cs_id = req.params.cs_id;
            var modify_num = req.params.modify_num;

            // 해당 id를 가진 아이디어, 선택한 아이디어의 num로 idea_log 테이블을 조회하여 데이터 가져온다.
            await new Promise((res,rej)=>{
                var modifyidea_look_sql='SELECT * FROM cs_log JOIN cs_file_dir ON (cs_log.cs_id = cs_file_dir.cs_id) WHERE cs_log.cs_id=? AND cs_num=?;';
                var modifyidea_look_param=[cs_id, modify_num];
                conn.query(modifyidea_look_sql, modifyidea_look_param, function(err, rows){
                    if(err || rows==''){
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message="수정 전 데이터 가져오기 실패";
                        rej(error_request);
                    }
                    success_request.data=rows;
                    res(rows);
                })
            })

            conn.release();
            success_request.message="수정 전 데이터 가져오기 성공";
            res.send(success_request);
        }catch(err){
            res.send(err);
        }
    })
})


/**
 * 회원 관심사업 목록, http://localhost:3000/admins/idle/member-list/회원 이메일/inter-anno-list
 * 1. 해당회원의 anno 테이블 정보만 가져오자
 */
router.get('/idle/member-list/:member_email/inter-anno-list', (req, res)=>{
    console.log("세션 이메일: ",req.params.member_email) // 회원 이메일
    console.log("검색할 내용: ",req.query.inter_anno_search)  // 검색 내용
    console.log("페이지 번호: ", req.query.page) // 페이지 번호

    inter_anno_list(req.session.member_email, req.query.inter_anno_search, req.query.page).then(member_inter_anno_list=>{
        res.send(member_inter_anno_list);
    });
})


/**
 * 회원 관심사업 내용 보기, http://localhost:3000/admins/idle/member-list/회원 이메일/inter-anno-list/관심사업 번호
 */
router.get('/idle/member-list/:member_email/inter-anno-list/:anno_id', (req, res)=>{
    getConnection(async(conn)=>{
        try{
            var member_email = req.params.member_email;
            var anno_id = req.params.anno_id;

            await new Promise((res, rej)=>{
                var interanno_look_sql='SELECT * FROM anno JOIN anno_img_dir ON (anno.anno_id = anno_img_dir.anno_id) JOIN inter_anno ON (anno_img_dir.anno_id = inter_anno.anno_id) WHERE member_email=? AND anno.anno_id;';
                var interanno_look_params=[member_email, anno_id];
                conn.query(interanno_look_sql, interanno_look_params, function(err, rows){
                    if(err || rows==''){
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message="관심사업 데이터 불러오기 실패";
                        rej(error_request);
                    }
                    success_request.data=rows;
                    res(rows);
                })
            })
            conn.release();
            success_request.message="관심사업 데이터 불러오기 성공";
            res.send(success_request);
        }catch(err){
            res.send(err);
        }
    })
})

/**
 * 회원 정지처리, http://localhost:3000/admins/idle/member-list/회원 이메일/ban
 * 회원 목록에서 회원 클릭하면 마이페이지에서 여러개로 나뉘듯 여러 속성있음 (로그 보기 , 정지 처리 등...)
 * 회원 목록에서 회원 클릭할때 그 회원 이메일 세션에 저장
 * 1. 선택한 해당 회원 member 테이블에서 member_ban 값 1로 변경
 * 2. member_ban 테이블에 기록
 */
 router.post('/idle/member-list/:member_email/ban', (req, res) => {

    let member_email=req.params.member_email; // 회원 이메일
    let admin_email= req.session.admin_email; // 관리자 이메일

    getConnection(async (conn) => {
        try {

            let member_ban_sql;
            let member_ban_params;
            // 선택한 회원을 찾아서 member_ban 값을 1로 변경
            await new Promise((res, rej) => {
                member_ban_sql = 'UPDATE member SET member_ban=? WHERE member_email=?;';
                member_ban_params = [1, member_email];
                conn.query(member_ban_sql, member_ban_params, function (err, rows) {
                    console.log(1)
                    if (err || rows == '') {
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message = "선택한 회원이 없음"
                        return rej(error_request);
                    }
                    res(rows);
                })
            })

            // member_ban 테이블에 기록
            await new Promise((res, rej) => {
                member_ban_sql = 'INSERT INTO member_ban (member_email, member_ban_reason, member_ban_date, admin_email) VALUES(?,?,?,?);';
                member_ban_params = [member_email, req.body.member_ban_reason, now_time(), admin_email];
                conn.query(member_ban_sql, member_ban_params, function (err, rows) {
                    if (err || rows == '') {
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message = "member_ban 테이블에 기록 실패";
                        return rej(error_request);
                    }
                    res(rows);
                });
            });

            conn.release();
            success_request.data={"member_email":member_email}
            success_request.message = "정지처리가 성공적으로 되었습니다."
            res.send(success_request);
        } catch (err) {
            res.send(err);
        }
    })
})


/**
 * 고객센터 목록, http://localhost:3000/admins/contact
 */
router.get('/contact', (req, res) => {
    getConnection(async (conn) => {
        try {
            let page_num = (req.query.page - 1)*10; // 페이지 번호
            let contact_search = req.query.contact_search; // 검색 내용

            //쿼리 조건
            let conatct_list_sql, contact_params;

            await new Promise((res, rej) => {
                if(contact_search == undefined){
                    // 검색 안한 경우
                    conatct_list_sql = 'SELECT contact.contact_id, email, contact_title, contact_send, contact_response FROM contact JOIN contact_log ON (contact.contact_id = contact_log.contact_id) LIMIT 10 OFFSET ?;';
                    contact_list_params = page_num;
                }else if( contact_search != undefined){
                    // 검색 한 경우
                    conatct_list_sql = 'SELECT contact.contact_id, email, contact_title, contact_send, contact_response FROM contact JOIN contact_log ON (contact.contact_id = contact_log.contact_id) WHERE MATCH(email) AGAINST(? IN boolean mode) LIMIT 10 OFFSET ?;';
                    contact_list_params = [contact_search + '*' , page_num];
                }
                conn.query(conatct_list_sql, contact_list_params, function (err, rows) {
                    console.log(rows)
                    if (err || rows == '') {
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message = "고객센터 데이터 조회 실패";
                        rej(error_request);
                    }
                    success_request.data = rows;
                    res();
                })
            })
            conn.release();
            success_request.message = "고객센터 데이터 조회 성공";
            res.send(success_request);
        } catch (err) {
            res.send(err);
        }

    })
})


/**
 * 고객센터 내용, http://localhost:3000/admins/contact/:contact_num
 */
router.get('/contact/:contact_num', (req, res) => {
    getConnection(async (conn) => {
        try {
            await new Promise((res, rej) => {
                let contact_sql = 'SELECT email, contact_title, contact_contents FROM contact WHERE contact_id=?;';
                conn.query(contact_sql, req.params.contact_num, function (err, rows) {
                    if (err || rows == '') {
                        console.log(err)
                        conn.release();
                        error_request.data=err;
                        error_request.message = "contact 데이터 불러오기 실패";
                        rej(error_request);
                    }
                    success_request.data = rows;
                    res();
                })
            })
            conn.release();
            success_request.message = "contact 데이터 불러오기 성공";
            res.send(success_request);
        } catch (err) {
            res.send(err);
        }
    })
})


/**
 * 고객센터 답변, http://localhost:3000/admins/contact/:contact_num/answer
 */
router.post('/contact/:contact_num/answer', (req, res)=>{
    try {
        let get_email = req.body.email; // 받는 사람 이메일
        let get_title = req.body.contact_title; // 보낼 제목
        let get_contents = req.body.contact_content // 보낼 내용
        let get_num = req.params.contact_num;

        // 메일 전송 ( 관리자 이메일 → 문의 넣은 사람)
        trans_mail.sendMail({
            from: process.env.GMAIL_EMAIL,
            to: get_email,
            subject: get_title,
            text: get_contents
        }, function (err) {
            console.log(111)
            if (err) {
                error_request.data=err;
                error_request.message = "메일 전송 실패";
                res.send(error_request);
            }

            getConnection(async (conn) => {
                try {
                    await new Promise((res, rej)=>{
                        let contact_answer_sql='UPDATE contact_log SET contact_response=? WHERE contact_id=?;';
                        let contact_answer_params=[now_time(), get_num];
                        conn.query(contact_answer_sql, contact_answer_params, function(err, rows){
                            console.log(rows)
                            if(err || rows==''){
                                console.log(err)
                                conn.release();
                                error_request.data=err;
                                error_request.message="contact_log 업데이트 실패";
                                rej(error_request);
                            }
                            res();
                        })
                    })

                    conn.release();

                    success_request.data={
                        "email":get_email,
                        "contact_title":get_title,
                        "contact_content":get_contents
                    }
                    success_request.message="contact_log 업데이트 성공";
                    res.send(success_request);
                } catch (err) {
                    res.send(err);
                }
            })
        })
    } catch (err) {
        res.send(err);
    }
})

module.exports = router;