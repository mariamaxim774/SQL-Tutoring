const { connectionPromise, dbConnectionPromise} = require('../database');

class QuestionModel{

    constructor(){
       
    }

    async load(cap,userId) {
        console.log("in load question");
        const connection = await connectionPromise;
        const sql = `
          SELECT q.question_id, q.question_text
            FROM questions AS q
            LEFT JOIN attempts AS a ON q.question_id = a.question_id AND a.user_id = ?
            WHERE q.category = ?
            AND a.attempt_id IS NULL
            ORDER BY q.difficulty ASC, q.attempts ASC;
        `;
        const [result] = await connection.execute(sql, [userId, cap]);
        
        if (result.length > 0) {
            return { success: true, message: result[0].question_text,questionId:result[0].question_id };
        } else {
           return{success:false,message:'No questions found'};
        }
    }

    async verifyAnswer(answer, questionId, userId) {
        const isCorrect = true;
        const insertSql = `INSERT INTO attempts (question_id, user_id, user_answer, is_correct)
                                   VALUES (?, ?, ?, ?)`;
        try {
            
            const connection = await connectionPromise;
    
            const sql = `SELECT correct_answer FROM questions WHERE question_id=?`;
            const [result] = await connection.execute(sql, [questionId]);
            const correctAnswer = result[0].correct_answer;
            
            console.log(answer)
            console.log(correctAnswer)
            if(answer===correctAnswer){

                await connection.execute(insertSql, [questionId, userId, answer, isCorrect]);
                console.log(result[0])
                return true; 
                
            }  
    
            try{
               const [results1,fields1] = await connection.query(correctAnswer);
               const [results2,fields2] = await connection.query(answer);
               console.log(fields1)
               console.log(fields2)
            if (results1[0] && results2[0] && fields1 === fields2) {
               
                await connection.execute(insertSql, [questionId, userId, answer, isCorrect]);
                return true; 
            } else {
                console.log("Răspuns incorect!");
                return false;
            }
    
            }catch(err){
                console.error('Eroare la executarea interogării:', err);
                console.log("eroare")
                return false;
         }
            
        } catch (err) {
            console.error('Eroare la verificarea răspunsului:', err.message);
            return false;
        }
    }

    async sendRating(questionId,userId,dificultate){
        const connection = await connectionPromise;
        console.log("in model")
        try {
            const query = `
              INSERT INTO ratings (question_id, user_id, difficulty_rating)
              VALUES (?, ?, ?)
              ON DUPLICATE KEY UPDATE
              difficulty_rating = VALUES(difficulty_rating)
            `;
        
            const [result] = await connection.execute(query, [questionId, userId,dificultate]);
            
            console.log('Rating added successfully:', result);
            return true;
          } catch (error) {
            console.error('Error adding rating:', error);
            return false;
          } 
    }


    async addComment(comment,questionId,userId)
    {
        const connection = await connectionPromise;
        console.log("in model")
        try {
                  const sql = `
                    INSERT INTO ratings (question_id, user_id, comment)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    comment = VALUES(comment)
                  `;
                  const [result] = await connection.execute(sql, [questionId, userId, comment]);
                  console.log('Comment inserted or updated:', result);
                  return true;
                } catch (err) {
                  console.error('Error inserting or updating comment:', err.message);
                  return false;
                }
    }

    async addQuestion(capitol, intrebare, dificultate, raspuns, userId) {
        console.log("in model");
        try {
            const connection = await connectionPromise;
            console.log('Conexiunea la baza de date este deschisă.');
            const sqlStm = `
                SELECT role FROM users WHERE user_id = ?
            `;
            const [roleResult] = await connection.execute(sqlStm, [userId]);
            const role = roleResult[0].role;
    
            if (role === 'student') {
                try {
                    const forbiddenPatterns = /(?:DELETE|INSERT|UPDATE|DROP|ALTER|TRUNCATE)\s/i;
                    if (forbiddenPatterns.test(raspuns)) {
                        console.error('Interogarea SQL conține comenzi periculoase.');
                        return false;
                    }
                    const dbconnection=await dbConnectionPromise;
                    await dbconnection.execute(raspuns);
                    console.log('Interogarea SQL este validă.');
    
                    const sql = `
                        INSERT INTO questions (category, question_text, correct_answer, difficulty, created_by)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    const [result] = await connection.execute(sql, [capitol, intrebare, raspuns, dificultate, userId]);
                    console.log('Interogarea a fost inserată:', result);
                    return true;
                } catch (err) {
                    console.error('Interogarea SQL nu este validă sau a apărut o eroare:', err.message);
                    return false;
                }
            } else {
                try {
                    const sql = `
                        INSERT INTO questions (category, question_text, correct_answer, difficulty, created_by)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    const [result] = await connection.execute(sql, [capitol, intrebare, raspuns, dificultate, userId]);
                    console.log('Interogarea a fost inserată:', result);
                    return true;
                } catch (err) {
                    console.error('Error inserting or updating question:', err.message);
                    return false;
                }
            }
        } catch (err) {
            console.error('Eroare la conectarea la baza de date:', err.message);
            return false;
        }
    }
    

    
    async verifyCount(userId){
        const connection = await connectionPromise;
        try {
            const sql = `
            SELECT user_id,COUNT(*) as attempt_count
            FROM attempts
            WHERE user_id = ?
            GROUP BY user_id;

            `;

            const [rows] = await connection.execute(sql, [userId]);
            console.log(rows[0])
            if (rows.length > 0) {
            return rows[0].attempt_count;
            } else {
            console.log('No attempts found for this user.');
            return 0;
            }
        } catch (err) {
            console.error('Error getting attempt count:', err.message);
            return null;
        }
          } catch (err) {
            console.error('Error inserting or updating comment:', err.message);
            return false;
          }

    async getQueryById(questionId) {
      const connection = await connectionPromise;
      try {
          const sql = `
              SELECT q.question_id, q.category, q.question_text, q.correct_answer, q.difficulty, q.attempts, r.comment
              FROM questions q
              LEFT JOIN ratings r ON q.question_id = r.question_id
              WHERE q.question_id = ?
          `;
  
          const [rows] = await connection.execute(sql, [questionId]);
  
          if (rows.length === 0) {
              return null;
          }
  
          const question = {
              questionId: rows[0].question_id,
              category: rows[0].category,
              questionText: rows[0].question_text,
              correctAnswer: rows[0].correct_answer,
              difficulty: rows[0].difficulty,
              attempts: rows[0].attempts,
              comments: rows.map(row => ({
                  comment: row.comment
              })).filter(comment => comment.comment !== null)
          };
  
          return question;
      } catch (err) {
          console.error('Error getting question by ID:', err.message);
          return null;
      }
  }
  
    
  async getQueryByCategory(category) {
    const connection = await connectionPromise;
    try {
        const sql = `
            SELECT q.question_id, q.category, q.question_text, q.correct_answer, q.difficulty, q.created_by, q.attempts, r.comment
            FROM questions q
            LEFT JOIN ratings r ON q.question_id = r.question_id
            WHERE q.category = ?
        `;

        const [rows] = await connection.execute(sql, [category]);

        if (rows.length === 0) {
            return null; 
        }

        
        const questions = rows.map(row => ({
            questionId: row.question_id,
            category: row.category,
            questionText: row.question_text,
            correctAnswer: row.correct_answer,
            difficulty: row.difficulty,
            createdBy: row.created_by,
            attempts: row.attempts,
            comments: row.comment ? [{  
                comment: row.comment
            }] : []
        }));

        return questions;
    } catch (err) {
        console.error('Error getting questions by category:', err.message);
        return null;
    }
  }
    async getQueries() {
      const connection = await connectionPromise;
      try {
          const sql = `
              SELECT question_id, category, question_text, correct_answer, difficulty, created_by, attempts
              FROM questions 
          `;
  
          const [rows] = await connection.execute(sql);
  
          if (rows.length === 0) {
              return null; 
          }
  
          
          const questions = rows.map(row => ({
              questionId: row.question_id,
              category: row.category,
              questionText: row.question_text,
              correctAnswer: row.correct_answer,
              difficulty: row.difficulty,
              createdBy: row.created_by,
              attempts: row.attempts,
          }));
  
          return questions;
      } catch (err) {
          console.error('Error getting questions by category:', err.message);
          return null;
      }
    }

    async markQuestionAsIncorrect(questionId, userId) {
        const connection = await connectionPromise;
        const is_incorrect = true;
        try {
            const sql = `
            INSERT INTO ratings (question_id, user_id, is_incorrect)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            is_incorrect = VALUES(is_incorrect)
          `;
          const [result] = await connection.execute(sql, [questionId, userId, is_incorrect]);
          return true;
        } catch (error) {
            console.error('Error marking question as incorrect:', error);
            return false;
        }
    }
}

  

module.exports=QuestionModel;