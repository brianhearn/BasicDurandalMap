
module.exports = function (grunt) {
    'use strict';

    var version = '1.0.0';
    var endpoint = 'https://apps.easyterritory.com/ADA47FA0-1FC6-4054-8227-A70EA1D53A0E/MDN';
    //var endpoint = 'http://localhost/mapdotnetux9.5';
    var mapId = 'ChapterMaps';

    var mixIn = require('mout/object/mixIn');
    var requireConfig = {
        baseUrl: 'app/',
        paths: {
            'text': '../Scripts/text',
            'durandal': '../Scripts/durandal',
            'plugins': '../Scripts/durandal/plugins',
            'transitions': '../Scripts/durandal/transitions',
            'knockout': '../Scripts/knockout-3.0.0',
            'jwerty': '../Scripts/jwerty-0.3',
            'moment': '../Scripts/moment',
            'modules': './modules',
            'common': './common',
            'mapsjs': '../Scripts/isc.rim',
            'lang': '../Scripts/i18next.amd.withJQuery-1.6.3.min',
            'async': '../Scripts/async',
            'spin': '../Scripts/spin',
            'jquery': 'empty:' // we have it in the global scope
        }
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        'clean': {
            pre: ['build/*'],
            post: ['build/app/common/**', 'build/app/modules/**', 'build/app/viewmodels/**', 'build/app/crm/**', 'build/app/views/**', 'build/REST/files/Project/**', 'build/REST/files/Csv/**', 'build/app/main.js']
        },

        'copy': {
            index: {
                src: 'index.html',
                dest: 'build/'
            },
            globalasax: {
                src: 'global.asax',
                dest: 'build/'
            },
            favicon: {
                src: 'favicon.ico',
                dest: 'build/'
            },
            bin: {
                src: 'bin/*.dll',
                dest: 'build/'
            },
            app: {
                src: 'app/**/**',
                dest: 'build/'
            },
            content: {
                src: 'content/**/**',
                dest: 'build/'
            },
            locales: {
                src: 'locales/**/*.json',
                dest: 'build/'
            },
            scripts: {
                src: 'Scripts/**/**',
                dest: 'build/'
            },
            rest: {
                src: 'REST/**/*.ashx',
                dest: 'build/'
            }
        },

        'durandal': {
            main: {
                src: ['app/**/*.*', 'scripts/durandal/**/*.js'],
                options: {
                    name: '../scripts/almond',
                    baseUrl: requireConfig.baseUrl,
                    mainPath: 'app/main',
                    paths: mixIn({}, requireConfig.paths, { 'almond': '../scripts/almond.js' }),
                    exclude: [],
                    optimize: 'none',
                    out: 'build/app/main.js'
                }
            }
        },

        'replace': {
            updateMain: {
                src: ['build/app/main.js'],
                overwrite: true,
                replacements: [
                    {
                        from: '@@APPVERSION@@',
                        to: version
                    }
                ]
            },
            updateMain2: {
                src: ['build/app/main.js'],
                overwrite: true,
                replacements: [
                    {
                        from: '@@APPENDPOINT@@',
                        to: endpoint
                    }
                ]
            },
            updateMain3: {
                src: ['build/app/main.js'],
                overwrite: true,
                replacements: [
                    {
                        from: '@@APPMAPID@@',
                        to: mapId
                    }
                ]
            },
            updateIndex: {
                src: ['build/index.html'],
                overwrite: true,
                replacements: [
                    {
                        from: './App/main',
                        to: './App/main' + version
                    }
                ]
            }
        },

        'uglify': {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> \n' +
                    '* Copyright <%= grunt.template.today("yyyy") %> Imager Software, Inc. \n' +
                    '*/\n'
            },
            build: {
                src: 'build/app/main.js',
                dest: 'build/app/main' + version + '.js'
            }
        }
    });

    // Loading plugin(s)
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-durandal');
    grunt.loadNpmTasks('grunt-ftp-deploy');
    grunt.loadNpmTasks('grunt-text-replace');

    grunt.registerTask('wipe', ['clean:pre']);
    grunt.registerTask('ftp', ['ftp-deploy']);
    grunt.registerTask('copyFiles', ['clean:pre', 'copy']);

    grunt.registerTask('version', ['replace:updateMain', 'replace:updateIndex']);
    grunt.registerTask('default', ['clean:pre', 'copy', 'durandal:main', 'replace', 'uglify', 'clean:post']);
};
