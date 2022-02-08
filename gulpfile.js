const gulp = require("gulp");
const zip = require('gulp-zip');
const webpack = require('gulp-webpack');

var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");


gulp.task("transpile", function () {
    return tsProject.src()
        .pipe(tsProject()).js
        .pipe(gulp.dest("dist"));
});

gulp.task('webpack', function () {
    return gulp.src('dist/*.js')
        .pipe(webpack({
            output: {
                filename: 'DiscordIntegration.js',
            },
        }))
        .pipe(gulp.dest('dist/'));
});

gulp.task("zip", function () {
    return gulp.src(['lang*/**/*', 'dist/**/*', 'module.json'])
        .pipe(zip('Discord-Integration.zip'))
        .pipe(gulp.dest('out'));
});

