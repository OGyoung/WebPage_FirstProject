/**
 * 설정 세팅
 */
 var express = require('express');
 var router = express.Router();
 const crypto = require('crypto');

 
 // db 연결
 var getConnection = require('../setting/db.js');

 // 응답 설정
var {success_request, error_request}= require('../setting/request.js');

 // 메일 설정
 var trans_mail = require('../setting/mail.js')
 
 // 세션 연결
 var session = require('../setting/session.js');
const app = require('../app.js');
 router.use(session)
 
 // 현재 시간
 var now_time = new Date();
 
 // 다음 날 (현재 시간 + 24시간)
 var tomorrow_time = new Date(now_time.setDate(now_time.getDate() + 1));
 var now_time = new Date();


/** 
 *  관리자 등록 필요없음
*/

/**
 * 관리자 이메일 중복 확인, http://localhost:3000/admins/idle/admins/has-same-id
 * 1. 입력된 이메일에서 value 값(이메일)만 가져옴
 * 2. member 테이블에 입력받은 이메일 값이 있는지 확인해서 있으면 생성불가, 없으면 생성가능 응답처리
 * 
*/
router.post('/idle/has-same-id', (req, res) => {

    // 포스트맨에서 얻어온 이메일 값
    var check_email = req.body.admin_email;
    console.log("입력 이메일 확인 : " + check_email);

    // db 연결
    getConnection(async(conn) => {
        try{
            await new Promise((res, rej)=>{
                // db에서 admin_email 값들 가져와서 check_email 과 같은지 비교
                var same_email_sql = 'SELECT admin_email FROM admin WHERE admin_email=?;';
                conn.query(same_email_sql, check_email, function (err, rows) {
                        if (err || rows == '') {
                            return rej(err)
                        }
                    res(rows);
                });
            });
            conn.release();
            error_request.message = "아이디 생성 불가능"
            res.send(error_request);
        }catch (err) {
            conn.release();
            success_request.message = "아이디 생성가능"
            res.send(success_request);
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

    // 관리자가 입력한 이메일(0), 비밀번호 (1)
    var admin = new Array();
    for(k in req.body){
        admin.push(req.body[k]);
    }

    // 비밀번호 해시화
    admin[1]=crypto.createHash('sha512').update(admin[1]).digest('base64');

    //db 연결
    getConnection(async(conn)=>{
        try{
            // db에 일치하는 이메일과 비밀번호가 있는지 확인
            var admin_login_sql = 'SELECT * FROM admin WHERE admin_email=? AND admin_pw=? AND admin_secede=?;';
            var admin_login_param = [admin[0], admin[1], 0];
            await new Promise((res, rej)=>{
                conn.query(admin_login_sql, admin_login_param, function (err, rows){
                    if (err || rows == '') {
                        error_request.message="이메일 혹은 비밀번호가 틀렸습니다."
                        conn.release();
                        rej(error_request);
                    }
                    res(rows);
                })
            })
            
            // 로그인한 시간 확인, admin_log 테이블 업데이트
            var admin_log_sql ='UPDATE admin_log SET admin_login_lately=? WHERE admin_email=?;';
            var admin_log_param = [now_time, admin[0]];
            await new Promise((res,rej)=>{
                conn.query(admin_log_sql,admin_log_param, function(err, rows){
                    if(err || rows==''){
                        conn.release();
                        error_request.message="amdin_log 테이블 에러"
                        rej(error_request);
                    }
                    res(rows);
                })
            })

            //세션 저장
            req.session.admin_email = admin[0];
            req.session.save(function () {
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
        req.session.destroy(function () {
            req.session;
            //res.redirect('/home'); // 홈으로 이동하게 하자
           success_request.message("로그아웃에 성공하였습니다.")
            res.send(success_res)
        });
    } catch {
        error_request.message("로그아웃에 실패하였습니다.")
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
 * 회원 리스트 목록, http://localhost:3000/admins/idle/member-list
 * 회원 리스트 목록을 페이지에 어떻게 표현할지 더 생각해보자
 * 1. member 테이블에서 회원 리스트 뽑음
 */
router.get('/idle/member-list', (req, res)=>{
    
    getConnection(async(conn)=>{
        try{
            // 회원 목록 뽑기
            await new Promise((res, rej)=>{
                var member_list_sql='SELECT * FROM member';
                conn.query(member_list_sql, function(err, rows){
                    if(err || rows==''){
                        error_request.message="회원 조회 실패";
                        conn.release();
                        rej(error_request);
                    }
                    success_request.data=rows; //응답 데이터
                    conn.release();
                    res(rows);
                });
            }); 

            success_request.message="회원 목록 조회 성공"
            res.send(success_request);
        }
        catch(err){
            res.send(err)
        }
    })
})


/**
 * 회원 리스트 목록을 페이지에 어떻게 표현할지 더 생각해보자
 * 회원 리스트 검색, http://localhost:3000/admins/idle/member-list?검색어
 */
router.get('/idle/member-list', (req, res)=>{


})


/**
 * 회원 정지처리, http://localhost:3000/admins/idle/ban
 * 회원 목록에서 회원 클릭하면 마이페이지에서 여러개로 나뉘듯 여러 속성있음 (로그 보기 , 정지 처리 등...)
 * 회원 목록에서 회원 클릭할때 그 회원 이메일 세션에 저장
 * 1. 선택한 해당 회원 member 테이블에서 member_ban 값 1로 변경
 * 2. member_ban 테이블에 기록
 */
router.put('/idle/ban', (req, res) => {

    getConnection(async (conn) => {
        try {
            //var member_email = req.session.member_email; // 회원 이메일
            var admin_email = req.session.admin_email; // 관리자 이메일
            var member_email = 'ㅁㄴㅇㄹ@naver.com';
            // 선택한 회원을 찾아서 member_ban 값을 1로 변경
            await new Promise((res, rej) => {
                var member_ban_sql = 'UPDATE member SET member_ban=? WHERE member_email=?;';
                var member_ban_param = [1, member_email];
                conn.query(member_ban_sql, member_ban_param, function (err, rows) {
                    if (err || rows == '') {
                        conn.release();
                        error_request.message = "선택한 회원이 없음"
                        return rej(error_request);
                    }
                    res(rows);
                })
            })

            // member_ban 테이블에 기록
            await new Promise((res, rej) => {
                member_ban_sql = 'INSERT INTO member_ban (member_email, member_ban_reason, member_ban_date, admin_email) VALUES(?,?,?,?);';
                member_ban_param = [member_email, req.body.member_ban_reason, now_time, admin_email];
                conn.query(member_ban_sql, member_ban_param, function (err, rows) {
                    if (err || rows == '') {
                        console.log(err)
                        conn.release();
                        error_request.message = "member_ban 테이블에 기록 실패";
                        return rej(error_request);
                    }
                    res(rows);
                });
            });

            conn.release();
            success_request.message = "정지처리가 성공적으로 되었습니다."
            res.send(success_request);
        } catch (err) {
            return res.send(err);
        }
    })
})






module.exports = router;