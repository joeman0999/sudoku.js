// Code for a multiplayer sudoku
// 8
/*
Additional Controls:
    arrow keys to move squares
    number keys for editing squares
    tab to switch between cell nad note

Code remaining human solvable techniques

Create Room     Join Room
vs   co-op      Room: [   ]   Join


*/

var socket = io();

// Selectors
const BOARD_SEL = "#sudoku-board";
const TABS_SEL = "#difficulty-tabs";
const MESSAGE_SEL = "#message";
const PUZZLE_CONTROLS_SEL = "#puzzle-controls";
const IMPORT_CONTROLS_SEL = "#import-controls";
const SOLVER_CONTROLS_SEL = "#solver-controls";

var $selected_square = null;

var ROOM = {
    "code": null,
    "leader": false,
    "roomType": null,
    "mistakesCheck": false,
    "difficulty": null
}

// Boards
// Cached puzzles grids

var BOARD = {
    "original_board": null,
    "user_vals": null,
    "candidates": null,
    "solution": null,
    "difficulty": null,
    "true_difficulty": null,
}

var build_board = function(){
    for(var r = 0; r < 9; ++r){
        var $row = $("<tr/>", {});
        $row.addClass("mainBoardRow");
        for(var c = 0; c < 9; ++c){
            var $square = $("<td/>", {});
            $square.addClass("mainBoard");
            if(c % 3 == 2 && c != 8){
                $square.addClass("border-right");
            }
            $square.append(
                $("<div/>", {
                    id: "row" + r + "-col" + c,
                    class: "square",
                    maxlength: "1",
                    type: "text",
                })
            );
            $row.append($square);
        }
        if(r % 3 == 2 && r != 8){
            $row.addClass("border-bottom");
        }
        $(BOARD_SEL).append($row);
    }
};

var build_markup_square = function(markups) {
    var $innerSquare = $("<table/>", {});
    $innerSquare.addClass("innerTable");
    for(var r = 0; r < 3; ++r){
        var $row = $("<tr/>", {});
        for(var c = 0; c < 3; ++c){
            var $square = $("<td/>", {});
            $square.append(
                $("<div/>", {
                    id: "inner" + (r*3 + c + 1),
                    class: "innerSquare",
                    maxlength: "1",
                    type: "text"
                })
            );
            for (var i = 0; i < markups.length; i++) {
                if (markups[i] == r*3 + c + 1) {
                    $square.children().text((r*3 + c + 1));
                    break;
                }
            }
            
            $row.append($square);
        }
        $($innerSquare).append($row);
    }
    return $innerSquare;
}

$.fn.immediateText = function() {
    return this.contents().not(this.children()).text();
};

var init_board = function(){
    /* Initialize board interactions
    */
    $(BOARD_SEL + " div.square").click(function(){

        $(BOARD_SEL + " div.square").css("font-weight","normal");
        $(BOARD_SEL + " div.innerSquare").css("font-weight","normal");
        $(BOARD_SEL + " div.square").removeClass("selected-box");
        $(BOARD_SEL + " div.square").removeClass("related-box");
        if ($selected_square != null && $selected_square.attr("id") == $(this).attr("id")) {
            $selected_square = null;
        } else {
            $selected_square = $(this);
            $selected_square.addClass("selected-box");

            // Color the related boxes
            var row = $selected_square.attr("id")[3];
            var column = $selected_square.attr("id")[8];
            var r = Math.floor(row / 3) * 3;
            var c = Math.floor(column / 3) * 3;
            for (var i = 0; i < 3; i++) {
                r = Math.floor(row / 3) * 3;
                for (var j = 0; j < 3; j++) {
                    if (i*3 + j != row) {
                        $("#row" + (i*3 + j) + "-col" + column).addClass("related-box");
                    }
                    if (i*3 + j != column) {
                        $("#row" + row + "-col" + (i*3 + j)).addClass("related-box");
                    }
                    if (r != row || c != column) {
                        $("#row" + r + "-col" + c).addClass("related-box");
                    }
                    r = r + 1;
                }
                c = c + 1;
            }

            /* Bold the squares containing the same value if there is only
            a single value in the selected square
            */
            var number = $selected_square.immediateText();
            if (number != null && number != "") {
                var $allSquares = $(BOARD_SEL + " div.square");
                var $allInnerSquares = $(BOARD_SEL + " div.innerSquare");
                for (var i = 0; i < $allSquares.length; i++) {
                    if ($($allSquares[i]).immediateText() == number) {
                        $($allSquares[i]).css("font-weight","bold");
                    }
                }
                for (var i = 0; i < $allInnerSquares.length; i++) {
                    if ($($allInnerSquares[i]).immediateText() == number) {
                        $($allInnerSquares[i]).css("font-weight","900");
                    }
                }
            }
        }
    });
};

var init_menu_controls = function() {
    // CONTROLS
    // Create-Game button
    $("#create-button").click(function(e){
        socket.emit('create-request');
    });

    // Join-Game button
    $("#join-button").click(function(e){
        const roomCodeLength = 5;
        var code = $("#join-code").val();
        if(code.length == roomCodeLength) {
            socket.emit('join-request', code);
        } else {
            $(MESSAGE_SEL + " #text")
                .html("<strong>Unable to join room!</strong> "
                + "Check code and try again.");
            $(MESSAGE_SEL).show();
        }
    });

    // Initialize the Sudoku difficulty tabs
    $(TABS_SEL + " button").click(function(e){
        e.preventDefault();
        var $t = $(this);
        if (sudoku.DIFFICULTY[BOARD.difficulty]) {
            $("#" + BOARD.difficulty).removeClass("option-selected");
        }
        BOARD.difficulty = $t.attr("id");
        ROOM["difficulty"] = BOARD.difficulty;
        $t.addClass("option-selected");
        
        // If it's the import tab
        if(BOARD.difficulty === "import"){
            $(PUZZLE_CONTROLS_SEL).hide();
            $(IMPORT_CONTROLS_SEL).show();
        
        // Otherwise it's a normal difficulty tab
        } else {
            $(PUZZLE_CONTROLS_SEL).show();
            //$(SOLVER_CONTROLS_SEL).show();
            $(IMPORT_CONTROLS_SEL).hide();
        }
    });

    $("#game-type button").click(function(e){
        if (ROOM["roomType"]) {
            $("#" + ROOM["roomType"]).removeClass("option-selected");
        }
        e.preventDefault();
        var $t = $(this);
        ROOM["roomType"] = $t.attr("id");
        $t.addClass("option-selected");

    })

    $("#show-mistakes").click(function(e){
        e.preventDefault();
        var $t = $(this);
        if (ROOM["mistakesCheck"]) {
            $t.removeClass("option-selected");
            ROOM["mistakesCheck"] = false;
        } else {
            ROOM["mistakesCheck"] = true;
            $t.addClass("option-selected");
        }
    })

    // Start game button
    $("#start-game").click(function(e){
        e.preventDefault();

        $("#options-menu").hide();
        $("#loading").show();

        if(BOARD.difficulty === null){
            $(MESSAGE_SEL + " #text")
                    .html("<strong>Select a difficulty.</strong> ");
            $(MESSAGE_SEL).show();
            return;
        } else if (ROOM["roomType"] === null) {
            $(MESSAGE_SEL + " #text")
                    .html("<strong>Select the type of game.</strong> ");
            $(MESSAGE_SEL).show();
            return;
        }
        const myTimeout = setTimeout(start_game, 100); // allows page to load
    }); 

    // Import controls
    $(IMPORT_CONTROLS_SEL + " #import-string").change(function(){
        /* Update the board to reflect the import string
        */
        var import_val = $(this).val();
        var processed_board = "";
        for(var i = 0; i < 81; ++i){
            if(typeof import_val[i] !== "undefined" &&
                    (sudoku._in(import_val[i], sudoku.DIGITS) || 
                    import_val[i] === sudoku.BLANK_CHAR)){
                processed_board += import_val[i];
            } else {
                processed_board += sudoku.BLANK_CHAR;
            }
        }
        BOARD.original_board = sudoku.board_string_to_grid(processed_board);
        BOARD.difficulty = "import";
    });

    $(IMPORT_CONTROLS_SEL + " #import-string").keyup(function(){
        /* Fire a change event on keyup, enforce digits
        */
        $(this).change();
    });

    $("#game").hide();
    $("#options-menu").hide();
    $(PUZZLE_CONTROLS_SEL).hide();
    $(SOLVER_CONTROLS_SEL).hide();
}

var init_controls = function(){
    /* Initialize the controls
    */
    // Notes Option
    $(PUZZLE_CONTROLS_SEL + " #notes").click(function(e){
        e.preventDefault();
        var text = $(this).text();
        if (text == "Cell") {
            $(this).text("Notes");
            $(this).title = "Write a note in a cell";
        } else {
            $(this).text("Cell");
            $(this).title = "Write a number in a cell";
        }
    });
    $(PUZZLE_CONTROLS_SEL + " #reset").click(function(e){
        e.preventDefault();
        BOARD.user_vals = JSON.parse(JSON.stringify(BOARD.original_board));
        BOARD.candidates = JSON.parse(JSON.stringify(BOARD.original_board));
        // Display the puzzle
        display_puzzle(BOARD.original_board, null, null);
        
    });
    
    // Number buttons
    $("#number-buttons button").click(function(e){
        e.preventDefault();
        
        if ($selected_square != null) {
            var row = $selected_square.attr("id")[3];
            var column = $selected_square.attr("id")[8];
            if (BOARD.original_board[row][column] == sudoku.BLANK_CHAR) {
                var number = $(this).text();
                if ($(PUZZLE_CONTROLS_SEL + " #notes").text() == "Cell") {
                    
                    if (BOARD.user_vals[row][column] == number) {
                        // number is there set it to nothing
                        BOARD.user_vals[row][column] = ".";
                    } else {
                        // number is not there set it to the new number and erase the candidates for this square
                        BOARD.user_vals[row][column] = number;
                        BOARD.candidates[row][column] = ".";
                        
                        var map_pos = sudoku.pos_to_map(row, column);
                        for(var ui in sudoku.SQUARE_PEERS_MAP[map_pos]){
                            var x = sudoku.SQUARE_PEERS_MAP[map_pos][ui];
                            var row_col = sudoku.map_to_pos(x);
                            BOARD.candidates[row_col.row][row_col.col] = BOARD.candidates[row_col.row][row_col.col].replace(number, '');
                        }
                    }
                } else {
                    BOARD.user_vals[row][column] = ".";
                    if (BOARD.candidates[row][column].includes(number)) {
                        BOARD.candidates[row][column] = BOARD.candidates[row][column].replace(number, '');
                    } else if (BOARD.candidates[row][column] == sudoku.BLANK_CHAR) {
                        BOARD.candidates[row][column] = number;
                    } else {
                        BOARD.candidates[row][column] += number;
                    }
                }
            }
            socket.emit('update-request', BOARD);
        }

    });
    
    // Solver controls
    $(SOLVER_CONTROLS_SEL + " #solve").click(function(e){
        /* Solve the current puzzle
        */
        e.preventDefault();
        var solution = solve_puzzle();
        if (solution != null) {
            display_puzzle(BOARD.original_board, solution, null);
            $(MESSAGE_SEL).hide();
        }
    });
    
    $(SOLVER_CONTROLS_SEL + " #get-candidates").click(function(e){
        /* Get candidates for the current puzzle
        */
        e.preventDefault();
        BOARD.candidates = get_initial_candidates();
    });
};

var init_message = function(){
    /* Initialize the message bar
    */
    
    //Hide initially
    $(MESSAGE_SEL).hide();
};

var start_game = function() {
    if(BOARD.difficulty === "import"){
        //BOARD.original_board = sudoku.board_string_to_grid(sudoku.BLANK_BOARD); // should already be set
        var solution = sudoku.solve(sudoku.board_grid_to_string(BOARD.original_board), false);
        var solution2 = sudoku.solve(sudoku.board_grid_to_string(BOARD.original_board), true);
        if(solution === false){
            $(MESSAGE_SEL + " #text")
                .html("<strong>Unable to solve imported puzzle!</strong> "
                + "Check puzzle and try again.");
            $(MESSAGE_SEL).show();
            return;
        } else if (solution == solution2) {
            BOARD.true_difficulty = sudoku.human_solve(sudoku.board_grid_to_string(BOARD.original_board));
            BOARD.solution = sudoku.board_string_to_grid(solution);
        }
    } else {
        var result = sudoku.generate(BOARD.difficulty);
        BOARD.original_board = sudoku.board_string_to_grid(result.board);
        BOARD.solution = sudoku.board_string_to_grid(result.solution);
        BOARD.true_difficulty = result.true_difficulty;
    }
    BOARD.user_vals = JSON.parse(JSON.stringify(BOARD.original_board));
    BOARD.candidates = JSON.parse(JSON.stringify(BOARD.original_board));
    console.log("what happened?");
    console.log(BOARD);
    socket.emit('start-request', BOARD);
    console.log(BOARD);
};

var solve_puzzle = function(){
    /* Solve the specified puzzle
    */
    
    // Solve only if it's a valid puzzle
    if(typeof BOARD.original_board !== "undefined"){
        try{
            var solved_board = 
                sudoku.solve(sudoku.board_grid_to_string(BOARD.original_board));
            if (solved_board === false) {
                $(MESSAGE_SEL + " #text")
                .html("<strong>Unable to solve!</strong> "
                    + "Check puzzle and try again.");
                $(MESSAGE_SEL).show();
                return null;
            } else {
                return sudoku.board_string_to_grid(solved_board);
            }
        } catch(e) {
            $(MESSAGE_SEL + " #text")
                .html("<strong>Unable to solve!</strong> "
                    + "Check puzzle and try again.");
            $(MESSAGE_SEL).show();
            return null;
        }
    }
};

var get_initial_candidates = function(){
    /* Get the candidates for the specified puzzle and show it
    returns the found candidates
    */
    
    // Get candidates only if it's a valid puzzle
    if(typeof BOARD.original_board !== "undefined"){
        
        var candidates = 
            sudoku.get_initial_candidates(
                sudoku.board_grid_to_string(BOARD.original_board)
            );
        
        
        // Display the candidates
        display_puzzle(BOARD.original_board, null, candidates);
        $(MESSAGE_SEL).hide();
        return candidates;
    }
}

var display_puzzle = function(org_board, new_board, markups){
    /* Display a Sudoku puzzle on the board. */
    for(var r = 0; r < 9; ++r){
        for(var c = 0; c < 9; ++c){
            var $square = $(BOARD_SEL + " div#row" + r + "-col" + c);
            $square.removeClass("green-text");
            if(org_board[r][c] != sudoku.BLANK_CHAR){
                $square.text(org_board[r][c]);
            } else if (new_board != null && new_board[r][c] != sudoku.BLANK_CHAR) {
                $square.addClass("green-text");
                $square.text(new_board[r][c]);
            } else if (markups != null && markups[r][c] != sudoku.BLANK_BOARD) {
                $square.text("");
                $square.addClass("green-text");
                $square.append(build_markup_square(markups[r][c]));
            } else {
                $square.text("");
            }
        }
    }
};

var click_tab = function(tab_name){
    /* Click the specified tab by name
    */
    $(TABS_SEL + " #" + tab_name).click();
};

socket.on('join-reply', function(data) {
    if (data == null || data.message == null) {
        return; // shouldn't ever happen but just in case
    } else if (data["message"] == "Room does not exist") {
        $(MESSAGE_SEL + " #text")
                .html("<strong>Unable to join room!</strong> "
                + "Check code and try again.");
        $(MESSAGE_SEL).show();
        return;
    } else if (data["message"] == "Room full") {
        $(MESSAGE_SEL + " #text")
                .html("<strong>Unable to join room!</strong> "
                + "Room at max occupancy.");
        $(MESSAGE_SEL).show();
        return;
    } else if (data["message"] == "Room joined") {
        $("#splash").hide();
        
        ROOM["code"] = data['room'];
        ROOM["leader"] = data['leader'];
        $("#room-tag").text("Room: " + data['room']);

        if (ROOM["leader"]) {
            $("#options-menu").show();
        } else if (data['board']) {
            BOARD = data['board'];
            $("#game").show();
            $(PUZZLE_CONTROLS_SEL).show();
            $(SOLVER_CONTROLS_SEL).show();
            display_puzzle(BOARD.original_board, BOARD.user_vals, BOARD.candidates);
        } else {
            $("#loading").show();
            $("#waiting-screen").show();
        }
    }
});

socket.on('start-event', function(data) {
    console.log("start-event started")
    // Show the puzzle and controls
    $("#game").show();
    $(PUZZLE_CONTROLS_SEL).show();
    $(SOLVER_CONTROLS_SEL).show();
    // Hide options
    $("#options-menu").hide();
    $("#loading").hide();
    $("#waiting-screen").hide();

    BOARD = data;
    display_puzzle(BOARD.original_board, null, null);
});

socket.on('join-event', function(data) {
    // data.message = "NAME";
    // useful later for tracking the names of the people in the room
});

socket.on('update-event', function(data) {
    BOARD = data;
    display_puzzle(BOARD.original_board, BOARD.user_vals, BOARD.candidates);
});

socket.on('new-leader', function(data) {
    if (data == null) {
        ROOM["leader"] = true;
    } else {
        // ROOM["leader"] = data['leader'];
    }
    

    $("#options-menu").show();
    $("#loading").hide();
    $("#waiting-screen").hide();
});


// "Main" (document ready)
$(function(){
    build_board();
    init_board();
    init_menu_controls();
    init_controls();
    init_message();
    
    // Initialize tooltips
    $("[rel='tooltip']").tooltip();
    
    // Start with generating an easy puzzle
    //click_tab("easy");
    
    // Hide the loading screen, show the app
    $("#app-wrap").removeClass("hidden");
    $("#loading").hide();
});