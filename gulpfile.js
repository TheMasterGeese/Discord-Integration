const gulp = require("gulp");
const zip = require('gulp-zip');

var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");



gulp.task("transpile", function () {
    return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});

gulp.task("zip", function() {
    return gulp.src('lang/*', 'dist/*', 'module.json')
		.pipe(zip('Discord-Integration.zip'))
		.pipe(gulp.dest('out'))
});
