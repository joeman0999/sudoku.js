/*
    A Sudoku puzzle human methods solver library.
*/

var TECHNIQUES = {
    "singles": {
        "1st_use": 100,
        "subs_use": 100
    },
    "candidate_lines": {
        "1st_use": 350,
        "subs_use": 200
    },
    "double_pairs": {
        "1st_use": 500,
        "subs_use": 250
    },
    "multiple_lines": {
        "1st_use": 700,
        "subs_use": 400
    },
    "naked_pair": {
        "1st_use": 750,
        "subs_use": 500
    },
    "hidden_pair": {
        "1st_use": 1500,
        "subs_use": 1200
    },
    "naked_triple": {
        "1st_use": 2000,
        "subs_use": 1400
    },
    "hidden_tripple": {
        "1st_use": 2400,
        "subs_use": 1600
    },
    "x-wing": {
        "1st_use": 2800,
        "subs_use": 1600
    },
    "naked_quad": {
        "1st_use": 5000,
        "subs_use": 4000
    },
    "hidden_quad": {
        "1st_use": 7000,
        "subs_use": 5000
    },
    "swordfish": {
        "1st_use": 8000,
        "subs_use": 6000
    },
    "forcing_chains": {
        "1st_use": 9000,
        "subs_use": 6500
    },
    "nishio": {
        "1st_use": 10000,
        "subs_use": 8500
    },
}

sudoku.human_solve = function(board) {
    // takes a board string and returns the difficulty of the board

    var candidates = sudoku.get_candidates(board);
    board = sudoku.board_string_to_grid(board);
    var difficulty = 0;

    // calculates all single candidates and single postions
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            if (board[i][j] == '.' && candidates[i][j].length == 1) {
                difficulty += 100;
            }
        }
    }

    // while the puzzle is not solved keep trying to solve it
    // while (!sudoku.check_candidates(candidates)) {

    // }

    return difficulty;
}

sudoku.check_candidates = function(candidates) {
    // takes a board grid of candidates and returns true if board is solved
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            if (candidates[i][j].length != 1) {
                return false;
            }
        }
    }
    return true;
}