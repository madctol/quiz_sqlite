

const Sequelize = require('sequelize');

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');


/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Commandos:");
    log("  h|help - Muestra esta ayuda.");
    log("  list - Listar los quizzes existentes.");
    log("  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("  add - Añadir un nuevo quiz interactivamente.");
    log("  delete <id> - Borrar el quiz indicado.");
    log("  edit <id> - Editar el quiz indicado.");
    log("  test <id> - Probar el quiz indicado.");
    log("  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("  credits - Créditos.");
    log("  q|quit - Salir del programa.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    models.quiz.findAll()
    .each(quiz => {
        log(`${colorize(quiz.id,'magenta')}]: ${quiz.question}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Esta función devuelve una promesa que:
 *  - Valida que se ha introducido un valor para el parámetro.
 *  - Convierte el parámetro en un número entero.
 * Si todo va bien, la promesa satisface y devuelve el valor de id a usar.
 * 
 * @param id Parametro con el índice a validar.
 */
const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id);  // coger la parte entera y descartar lo demás
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido.
 * Entonces la llamada a then que hay que hacer la promesa devuelta será:
 *      .then(answer => {...})
 * 
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y fin.
 * 
 * @param {*} rl Objeto readline usado para implementar el CLI.
 * @param {*} text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};


/**
 * Añade un nuevo quiz al módelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl => {
    makeQuestion(rl, ' Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, ' Introduzca la respuesta ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then((quiz) => {
        log(` ${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, ' Introduzca la respuesta: ')
            .then(a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
    // TODO usar validateId
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else if (id >= model.count()) {
        errorlog('El valor del parámetro id no es válido.');
    } else {
        try {
            const quiz = model.getByIndex(id);
            rl.question(colorize(quiz.question+'? ', 'red'), answer => {
                if (quiz.answer.trim().toUpperCase() == answer.trim().toUpperCase()){
                    log('Su respuesta es correcta');
                    biglog('Correcta', 'green');
                    rl.prompt();
                } else {
                    log('Su respuesta es incorrecta');
                    biglog('Incorrecta','red');
                    rl.prompt();
                }
            });
        } catch(error) {
            errorlog(error.message);
        }
    }
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {
    // TODO usar validateId

    let array = new Array();
    for (let i=0; i<model.count(); i++){
        array.push(i);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    shuffleArray(array);

    let abort = false;
    let hits = 0;
    function playQuiz(id){
        if (id < array.length){
            let quiz = model.getByIndex(array[id]);
            rl.question(colorize(quiz.question+'? ', 'red'), answer => {
                if (quiz.answer.trim().toUpperCase() == answer.trim().toUpperCase()){
                    hits++;
                    log('CORRECTO - Lleva ' + hits + ' aciertos.');
                } else {
                    abort = true;
                    log('INCORRECTO.');
                }
                if (!abort && id+1<array.length){
                    playQuiz(id+1);
                } else {
                    if (!abort){
                        log('No hay nada más que preguntar.');
                    }
                    log('Fin del juego. Aciertos: ' + hits);
                    biglog(hits, 'magenta');
                    rl.prompt();
                }
            });
        }
    }
    
    playQuiz(0);
    
};


/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log('Autor de la práctica:');
    log('Miguel Ángel Díaz Calvo', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};

