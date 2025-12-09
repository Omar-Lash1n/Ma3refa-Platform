import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [], // مش محتاجين imports حالياً لأننا بنستخدم HTML عادي
  templateUrl: './contact.html', // تأكد من الاسم
  styleUrl: './contact.css'      // تأكد من الاسم
})
export class ContactComponent {
  // ممكن نضيف لوجيك هنا بعدين للإرسال
}