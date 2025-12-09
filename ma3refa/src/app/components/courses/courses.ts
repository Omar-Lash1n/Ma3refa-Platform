import { Component } from '@angular/core';

@Component({
  selector: 'app-courses',
  imports: [],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class CoursesComponent { // سنسمي الكلاس CoursesComponent كمعيار ثابت
  // بيانات الكورسات الوهمية
  courses = [
    {
      id: 1,
      title: 'تطوير الويب الشامل (Full Stack)',
      lessons: 120,
      category: 'برمجة',
      image: 'assets/images/hero.png',
      color: '#6C63FF'
    },
    {
      id: 2,
      title: 'أساسيات الذكاء الاصطناعي',
      lessons: 45,
      category: 'ذكاء اصطناعي',
      image: 'assets/images/about-img.png',
      color: '#00E676'
    },
    {
      id: 3,
      title: 'مهارات القيادة والإدارة',
      lessons: 30,
      category: 'بزنس',
      image: 'assets/images/growth-img.png',
      color: '#FF4081'
    },
    {
      id: 4,
      title: 'تطوير الويب الشامل (Full Stack)',
      lessons: 120,
      category: 'برمجة',
      image: 'assets/images/hero.png',
      color: '#6C63FF'
    },
    {
      id: 5,
      title: 'أساسيات الذكاء الاصطناعي',
      lessons: 45,
      category: 'ذكاء اصطناعي',
      image: 'assets/images/about-img.png',
      color: '#00E676'
    },
    {
      id: 6,
      title: 'مهارات القيادة والإدارة',
      lessons: 30,
      category: 'بزنس',
      image: 'assets/images/growth-img.png',
      color: '#FF4081'
    }
  ];
}
