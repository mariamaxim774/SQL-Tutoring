const QuestionController = require('../controllers/QuestionController');
const cookie=require('cookie')
const AuthService = require('../services/AuthService');
const authService= new AuthService();
const questionController = new QuestionController();

function questionRoutes(req, res, pathname, method) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken;
    const userData = token ? authService.decodeToken({ headers: { cookie: req.headers.cookie } }) : null;
    const questionId = cookies.questionId;

    
    switch(method) {
        case 'GET':
            handleGetRequest(req, res, pathname, userData,questionId);
            break;
        case 'POST':
            handlePostRequest(req, res, pathname, userData,questionId);
            break;
        default:
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            break;
    }
}

function handleGetRequest(req, res, pathname, userData,questionId) {
    console.log(userData)
    if (pathname === '/question') {
        questionController.getQuestion(req, res,userData);
    }
    else if(pathname === '/rating'){
        questionController.sendRating(req, res,questionId,userData);
    }
    else if(pathname === '/query'){
        questionController.getQuery(req, res);
    }
    else if(pathname === '/verifyCount')
        {
            console.log("in rutare pt verify count")
            questionController.verifyCount(req, res,userData);
        } 
     else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

function handlePostRequest(req, res, pathname, userData,questionId) {

    if (pathname === '/answer') {
        questionController.verifyAnswer(req, res,questionId,userData);
    } 
    else if(pathname === '/comment')
        {
            questionController.addComment(req, res,questionId,userData);
        } 
    else if(pathname === '/addQuestion')
            {
                console.log("in ruta")
                questionController.addQuestion(req, res,userData);
            }       
    else if(pathname === '/incorrectProblem') {
            console.log("sunt in markedIncorrect");
            questionController.markIncorrect(req, res, questionId, userData);
    }else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

module.exports = questionRoutes;
